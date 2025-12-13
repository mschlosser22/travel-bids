// HotelBeds Hotel Provider Implementation
// Integrates with HotelBeds Hotel Booking API (APItude)

import crypto from 'crypto'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type {
  HotelProvider,
  SearchParams,
  HotelResult,
  HotelDetails,
  AvailabilityParams,
  Availability,
  BookingParams,
  Booking,
  CancellationResult,
  RoomOffer
} from './types'
import { ProviderError } from './types'

interface HotelBedsConfig {
  apiKey: string
  apiSecret: string
  environment: 'test' | 'production'
}

// In-memory GIATA cache
const giataCache = new Map<number, string | null>()

export class HotelBedsProvider implements HotelProvider {
  readonly name = 'hotelbeds'
  private config: HotelBedsConfig
  private baseUrl: string
  private supabase

  constructor(
    apiKey: string = process.env.HOTELBEDS_API_KEY!,
    apiSecret: string = process.env.HOTELBEDS_API_SECRET!,
    environment: 'test' | 'production' = (process.env.HOTELBEDS_ENVIRONMENT as any) || 'test'
  ) {
    if (!apiKey || !apiSecret) {
      throw new Error('HotelBeds API credentials are required')
    }

    this.config = { apiKey, apiSecret, environment }
    this.baseUrl = environment === 'production'
      ? 'https://api.hotelbeds.com'
      : 'https://api.test.hotelbeds.com'

    // Initialize Supabase client for GIATA cache
    this.supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }

  /**
   * Get GIATA ID for hotel code from cache (DB + memory)
   */
  private async getGiataId(hotelCode: number): Promise<string | null> {
    // Check in-memory cache first (fastest)
    if (giataCache.has(hotelCode)) {
      return giataCache.get(hotelCode) || null
    }

    // Check database cache
    const { data } = await this.supabase
      .from('hotelbeds_hotel_metadata')
      .select('giata_id')
      .eq('hotelbeds_code', hotelCode)
      .maybeSingle()

    const giataId = data?.giata_id || null

    // Store in memory cache for future requests
    giataCache.set(hotelCode, giataId)

    return giataId
  }

  /**
   * Batch fetch GIATA IDs for multiple hotels
   */
  private async batchGetGiataIds(hotelCodes: number[]): Promise<Map<number, string | null>> {
    const results = new Map<number, string | null>()

    // Separate cached and uncached
    const uncached: number[] = []
    for (const code of hotelCodes) {
      if (giataCache.has(code)) {
        results.set(code, giataCache.get(code) || null)
      } else {
        uncached.push(code)
      }
    }

    // Batch fetch uncached from database
    if (uncached.length > 0) {
      const { data } = await this.supabase
        .from('hotelbeds_hotel_metadata')
        .select('hotelbeds_code, giata_id')
        .in('hotelbeds_code', uncached)

      if (data) {
        for (const record of data) {
          const giataId = record.giata_id || null
          results.set(record.hotelbeds_code, giataId)
          giataCache.set(record.hotelbeds_code, giataId) // Cache in memory
        }
      }

      // Mark missing hotels as null in cache
      for (const code of uncached) {
        if (!results.has(code)) {
          results.set(code, null)
          giataCache.set(code, null)
        }
      }
    }

    return results
  }

  /**
   * Generate X-Signature for HotelBeds API authentication
   * Formula: SHA256(ApiKey + Secret + Timestamp)
   */
  private generateSignature(): { signature: string; timestamp: number } {
    const timestamp = Math.floor(Date.now() / 1000)
    const message = this.config.apiKey + this.config.apiSecret + timestamp
    const signature = crypto.createHash('sha256').update(message).digest('hex')

    return { signature, timestamp }
  }

  /**
   * Make authenticated request to HotelBeds API
   */
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'DELETE' = 'POST',
    body?: any
  ): Promise<T> {
    const { signature, timestamp } = this.generateSignature()

    const url = `${this.baseUrl}${endpoint}`

    const headers: Record<string, string> = {
      'Api-key': this.config.apiKey,
      'X-Signature': signature,
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip'
    }

    if (method === 'POST' && body) {
      headers['Content-Type'] = 'application/json'
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.error?.message ||
          `HotelBeds API error: ${response.status} ${response.statusText}`
        )
      }

      return await response.json()
    } catch (error: any) {
      throw new ProviderError(
        this.name,
        'API_ERROR',
        error.message || 'HotelBeds API request failed',
        error
      )
    }
  }

  async search(params: SearchParams): Promise<HotelResult[]> {
    try {
      // HotelBeds requires destination code, not city code
      // For MVP, we'll need to map city codes to HotelBeds destination codes
      // This is a placeholder - you'll need to implement proper mapping
      const destinationCode = await this.mapCityToDestination(params.cityCode)

      const requestBody = {
        stay: {
          checkIn: params.checkInDate,
          checkOut: params.checkOutDate
        },
        occupancies: [
          {
            rooms: params.roomQuantity || 1,
            adults: params.adults,
            children: 0
          }
        ],
        destination: {
          code: destinationCode
        }
      }

      // Optional: Add hotel name filter if specified
      if (params.hotelName) {
        // HotelBeds doesn't support name search in availability
        // We'd need to use Content API to get hotel codes first
        // For MVP, we'll skip this filter
      }

      const response = await this.request<any>(
        '/hotel-api/1.0/hotels',
        'POST',
        requestBody
      )

      if (!response.hotels?.hotels || response.hotels.hotels.length === 0) {
        return []
      }

      const hotels = response.hotels.hotels

      // Batch fetch GIATA IDs for all hotels
      const hotelCodes = hotels.map((h: any) => parseInt(h.code))
      const giataMap = await this.batchGetGiataIds(hotelCodes)

      // Map HotelBeds hotels to our format with GIATA IDs
      return hotels.map((hotel: any) => {
        const giataId = giataMap.get(parseInt(hotel.code))
        return this.mapToHotelResult(hotel, params, giataId)
      })

    } catch (error: any) {
      throw new ProviderError(
        this.name,
        error.code || 'SEARCH_ERROR',
        error.message || 'Failed to search hotels',
        error
      )
    }
  }

  async getDetails(providerHotelId: string, params: SearchParams): Promise<HotelDetails> {
    try {
      const requestBody = {
        stay: {
          checkIn: params.checkInDate,
          checkOut: params.checkOutDate
        },
        occupancies: [
          {
            rooms: params.roomQuantity || 1,
            adults: params.adults,
            children: 0
          }
        ],
        hotels: {
          hotel: [parseInt(providerHotelId)]
        }
      }

      const response = await this.request<any>(
        '/hotel-api/1.0/hotels',
        'POST',
        requestBody
      )

      if (!response.hotels?.hotels || response.hotels.hotels.length === 0) {
        throw new Error('Hotel not found')
      }

      const hotelData = response.hotels.hotels[0]
      const hotelResult = this.mapToHotelResult(hotelData, params)

      // Map room offers
      const rooms: RoomOffer[] = hotelData.rooms?.map((room: any) => ({
        roomId: room.code,
        roomType: room.name || 'STANDARD',
        description: room.description,
        maxOccupancy: room.paxes?.reduce((sum: number, pax: any) => sum + pax.adults, 0) || 2,
        bedType: undefined,
        price: parseFloat(room.rates?.[0]?.net || '0'),
        currency: 'USD',
        available: true,
        amenities: [],
        metadata: {
          rateKey: room.rates?.[0]?.rateKey,
          rateClass: room.rates?.[0]?.rateClass,
          cancellationPolicies: room.rates?.[0]?.cancellationPolicies
        }
      })) || []

      return {
        ...hotelResult,
        rooms,
        policies: {
          checkIn: hotelData.checkIn,
          checkOut: hotelData.checkOut,
          cancellation: hotelData.rooms?.[0]?.rates?.[0]?.cancellationPolicies?.[0]?.description
        },
        contactInfo: {
          phone: hotelData.phones?.[0]?.phoneNumber,
          email: hotelData.email
        }
      }

    } catch (error: any) {
      throw new ProviderError(
        this.name,
        error.code || 'DETAILS_ERROR',
        error.message || 'Failed to get hotel details',
        error
      )
    }
  }

  async checkAvailability(params: AvailabilityParams): Promise<Availability> {
    try {
      const requestBody = {
        stay: {
          checkIn: params.checkInDate,
          checkOut: params.checkOutDate
        },
        occupancies: [
          {
            rooms: params.roomQuantity || 1,
            adults: params.adults,
            children: 0
          }
        ],
        hotels: {
          hotel: [parseInt(params.providerHotelId)]
        }
      }

      const response = await this.request<any>(
        '/hotel-api/1.0/hotels',
        'POST',
        requestBody
      )

      if (!response.hotels?.hotels || response.hotels.hotels.length === 0) {
        return {
          available: false,
          rooms: [],
          totalPrice: 0,
          currency: 'USD'
        }
      }

      const hotelData = response.hotels.hotels[0]
      const rooms: RoomOffer[] = hotelData.rooms?.map((room: any) => ({
        roomId: room.code,
        roomType: room.name || 'STANDARD',
        description: room.description,
        maxOccupancy: room.paxes?.reduce((sum: number, pax: any) => sum + pax.adults, 0) || 2,
        bedType: undefined,
        price: parseFloat(room.rates?.[0]?.net || '0'),
        currency: 'USD',
        available: true,
        amenities: [],
        metadata: room
      })) || []

      const lowestPrice = Math.min(...rooms.map(r => r.price))

      return {
        available: rooms.length > 0,
        rooms,
        totalPrice: lowestPrice,
        currency: 'USD'
      }

    } catch (error: any) {
      throw new ProviderError(
        this.name,
        error.code || 'AVAILABILITY_ERROR',
        error.message || 'Failed to check availability',
        error
      )
    }
  }

  async createBooking(params: BookingParams): Promise<Booking> {
    try {
      // HotelBeds booking requires rateKey from availability response
      const requestBody = {
        holder: {
          name: params.guestDetails.firstName,
          surname: params.guestDetails.lastName
        },
        rooms: [
          {
            rateKey: params.metadata?.rateKey, // From availability check
            paxes: [
              {
                roomId: 1,
                type: 'AD', // Adult
                name: params.guestDetails.firstName,
                surname: params.guestDetails.lastName
              }
            ]
          }
        ],
        clientReference: params.metadata?.clientReference || `BOOKING-${Date.now()}`,
        tolerance: params.metadata?.tolerance || 2.00
      }

      const response = await this.request<any>(
        '/hotel-api/1.0/bookings',
        'POST',
        requestBody
      )

      const bookingData = response.booking

      return {
        bookingId: '', // Will be set by our system
        providerBookingId: bookingData.reference,
        status: bookingData.status === 'CONFIRMED' ? 'confirmed' : 'pending',
        confirmationNumber: bookingData.reference,
        hotelName: bookingData.hotel?.name || '',
        checkInDate: params.checkInDate,
        checkOutDate: params.checkOutDate,
        totalPrice: params.totalPrice,
        currency: params.currency,
        metadata: bookingData
      }

    } catch (error: any) {
      throw new ProviderError(
        this.name,
        error.code || 'BOOKING_ERROR',
        error.message || 'Failed to create booking',
        error
      )
    }
  }

  async cancelBooking(providerBookingId: string): Promise<CancellationResult> {
    try {
      const response = await this.request<any>(
        `/hotel-api/1.0/bookings/${providerBookingId}`,
        'DELETE'
      )

      return {
        success: response.booking?.status === 'CANCELLED',
        message: response.booking?.status === 'CANCELLED'
          ? 'Booking cancelled successfully'
          : 'Cancellation failed',
        refundAmount: response.booking?.totalNet
      }

    } catch (error: any) {
      throw new ProviderError(
        this.name,
        error.code || 'CANCELLATION_ERROR',
        error.message || 'Failed to cancel booking',
        error
      )
    }
  }

  /**
   * Map city code to HotelBeds destination code
   * TODO: Implement proper mapping using HotelBeds Content API
   */
  private async mapCityToDestination(cityCode: string): Promise<string> {
    // Hardcoded mappings for MVP
    const mappings: Record<string, string> = {
      'NYC': 'NYC', // New York
      'LAX': 'LAX', // Los Angeles
      'LON': 'LON', // London
      'PAR': 'PAR', // Paris
      // Add more mappings as needed
    }

    return mappings[cityCode] || cityCode
  }

  /**
   * Map HotelBeds hotel to our HotelResult format
   */
  private mapToHotelResult(hotelBedsHotel: any, params: SearchParams, giataId?: string | null): HotelResult {
    const cheapestRoom = hotelBedsHotel.rooms?.reduce((min: any, room: any) => {
      const roomPrice = parseFloat(room.rates?.[0]?.net || '999999')
      const minPrice = parseFloat(min?.rates?.[0]?.net || '999999')
      return roomPrice < minPrice ? room : min
    }, hotelBedsHotel.rooms?.[0])

    const price = parseFloat(cheapestRoom?.rates?.[0]?.net || '0')
    const nights = this.calculateNights(params.checkInDate, params.checkOutDate)

    return {
      providerId: this.name,
      providerHotelId: hotelBedsHotel.code?.toString() || '',
      name: hotelBedsHotel.name,
      description: hotelBedsHotel.description,
      address: `${hotelBedsHotel.address?.content || ''}, ${hotelBedsHotel.city?.content || ''}`,
      city: hotelBedsHotel.destinationName || hotelBedsHotel.city?.content || '',
      state: hotelBedsHotel.stateCode,
      country: hotelBedsHotel.countryCode || '',
      latitude: hotelBedsHotel.latitude ? parseFloat(hotelBedsHotel.latitude) : undefined,
      longitude: hotelBedsHotel.longitude ? parseFloat(hotelBedsHotel.longitude) : undefined,
      starRating: hotelBedsHotel.categoryCode ? parseInt(hotelBedsHotel.categoryCode.replace('EST', '')) : undefined,
      rating: hotelBedsHotel.rating,
      price,
      currency: cheapestRoom?.rates?.[0]?.currency || params.currency || 'USD',
      pricePerNight: price / nights,
      images: hotelBedsHotel.images?.map((img: any) => img.path) || [],
      amenities: hotelBedsHotel.facilities?.map((f: any) => f.description) || [],
      available: hotelBedsHotel.rooms?.length > 0,
      roomsAvailable: hotelBedsHotel.rooms?.length || 0,
      metadata: {
        hotelCode: hotelBedsHotel.code,
        categoryCode: hotelBedsHotel.categoryCode,
        destinationCode: hotelBedsHotel.destinationCode,
        zoneCode: hotelBedsHotel.zoneCode,
        giataId: giataId || undefined, // GIATA ID from cache for 100% confident matching!
        cheapestRateKey: cheapestRoom?.rates?.[0]?.rateKey
      }
    }
  }

  private calculateNights(checkIn: string, checkOut: string): number {
    const checkInDate = new Date(checkIn)
    const checkOutDate = new Date(checkOut)
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
    return nights || 1
  }
}
