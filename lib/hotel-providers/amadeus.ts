// Amadeus Hotel Provider Implementation
// Integrates with Amadeus Hotel Search, Offers, and Booking APIs

import Amadeus from 'amadeus'
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

export class AmadeusProvider implements HotelProvider {
  readonly name = 'amadeus'
  private client: Amadeus

  constructor(
    apiKey: string = process.env.AMADEUS_API_KEY!,
    apiSecret: string = process.env.AMADEUS_API_SECRET!,
    environment: 'test' | 'production' = (process.env.AMADEUS_ENVIRONMENT as any) || 'test'
  ) {
    if (!apiKey || !apiSecret) {
      throw new Error('Amadeus API credentials are required')
    }

    this.client = new Amadeus({
      clientId: apiKey,
      clientSecret: apiSecret,
      hostname: environment === 'production' ? 'production' : 'test'
    })
  }

  async search(params: SearchParams): Promise<HotelResult[]> {
    try {
      // Step 1: Search for hotels by city
      const hotelsResponse = await this.client.referenceData.locations.hotels.byCity.get({
        cityCode: params.cityCode,
        radius: params.radius || 50,
        radiusUnit: params.radiusUnit || 'KM',
        ratings: params.hotelName ? undefined : '1,2,3,4,5', // All ratings if not searching by name
      })

      if (!hotelsResponse.data || hotelsResponse.data.length === 0) {
        return []
      }

      let hotels = hotelsResponse.data

      // Filter by hotel name if specified (for targeted campaigns)
      if (params.hotelName) {
        const searchTerm = params.hotelName.toLowerCase()
        hotels = hotels.filter((hotel: any) =>
          hotel.name.toLowerCase().includes(searchTerm)
        )
      }

      // Get hotel IDs (Amadeus max is 50 per request)
      const hotelIds = hotels.slice(0, 50).map((hotel: any) => hotel.hotelId)

      if (hotelIds.length === 0) {
        return []
      }

      // Step 2: Get offers for these hotels (batch into groups of 50)
      const batchSize = 50
      const allOffers: any[] = []

      for (let i = 0; i < hotelIds.length; i += batchSize) {
        const batchIds = hotelIds.slice(i, i + batchSize)

        try {
          const offersResponse = await this.client.shopping.hotelOffersSearch.get({
            hotelIds: batchIds.join(','),
            checkInDate: params.checkInDate,
            checkOutDate: params.checkOutDate,
            adults: params.adults.toString(),
            roomQuantity: (params.roomQuantity || 1).toString(),
            currency: params.currency || 'USD',
          })

          if (offersResponse.data && offersResponse.data.length > 0) {
            allOffers.push(...offersResponse.data)
          }
        } catch (batchError: any) {
          console.warn(`Failed to fetch batch ${i / batchSize + 1}:`, batchError.message)
          // Continue with other batches even if one fails
        }
      }

      if (allOffers.length === 0) {
        return []
      }

      // Step 3: Map to our HotelResult format
      return allOffers.map((offer: any) => this.mapToHotelResult(offer))

    } catch (error: any) {
      const errorMessage = error.description || error.message || JSON.stringify(error.response?.result || error)
      throw new ProviderError(
        this.name,
        error.code || 'SEARCH_ERROR',
        errorMessage,
        error
      )
    }
  }

  async getDetails(providerHotelId: string, params: SearchParams): Promise<HotelDetails> {
    try {
      const response = await this.client.shopping.hotelOffersSearch.get({
        hotelIds: providerHotelId,
        checkInDate: params.checkInDate,
        checkOutDate: params.checkOutDate,
        adults: params.adults.toString(),
        roomQuantity: (params.roomQuantity || 1).toString(),
        currency: params.currency || 'USD',
      })

      if (!response.data || response.data.length === 0) {
        throw new Error('Hotel not found')
      }

      const hotelData = response.data[0]
      const hotelResult = this.mapToHotelResult(hotelData)

      // Map room offers
      const rooms: RoomOffer[] = hotelData.offers?.map((offer: any) => ({
        roomId: offer.id,
        roomType: offer.room?.typeEstimated?.category || 'STANDARD',
        description: offer.room?.description?.text || offer.room?.typeEstimated?.category,
        maxOccupancy: parseInt(offer.guests?.adults || '2'),
        bedType: offer.room?.typeEstimated?.bedType,
        price: parseFloat(offer.price?.total || '0'),
        currency: offer.price?.currency || 'USD',
        available: true,
        amenities: offer.room?.description?.amenities || [],
        metadata: {
          rateCode: offer.rateCode,
          rateFamilyEstimated: offer.rateFamilyEstimated,
          policies: offer.policies,
        }
      })) || []

      return {
        ...hotelResult,
        rooms,
        policies: {
          checkIn: hotelData.hotel?.checkInTime,
          checkOut: hotelData.hotel?.checkOutTime,
          cancellation: hotelData.offers?.[0]?.policies?.cancellation?.description?.text,
        },
        contactInfo: {
          phone: hotelData.hotel?.contact?.phone,
          email: hotelData.hotel?.contact?.email,
        }
      }

    } catch (error: any) {
      throw new ProviderError(
        this.name,
        error.code || 'DETAILS_ERROR',
        error.description || error.message || 'Failed to get hotel details',
        error
      )
    }
  }

  async checkAvailability(params: AvailabilityParams): Promise<Availability> {
    try {
      const response = await this.client.shopping.hotelOffersSearch.get({
        hotelIds: params.providerHotelId,
        checkInDate: params.checkInDate,
        checkOutDate: params.checkOutDate,
        adults: params.adults.toString(),
        roomQuantity: (params.roomQuantity || 1).toString(),
      })

      if (!response.data || response.data.length === 0) {
        return {
          available: false,
          rooms: [],
          totalPrice: 0,
          currency: 'USD'
        }
      }

      const hotelData = response.data[0]
      const rooms: RoomOffer[] = hotelData.offers?.map((offer: any) => ({
        roomId: offer.id,
        roomType: offer.room?.typeEstimated?.category || 'STANDARD',
        description: offer.room?.description?.text,
        maxOccupancy: parseInt(offer.guests?.adults || '2'),
        bedType: offer.room?.typeEstimated?.bedType,
        price: parseFloat(offer.price?.total || '0'),
        currency: offer.price?.currency || 'USD',
        available: true,
        amenities: offer.room?.description?.amenities || [],
        metadata: offer
      })) || []

      const lowestPrice = Math.min(...rooms.map(r => r.price))

      return {
        available: rooms.length > 0,
        rooms,
        totalPrice: lowestPrice,
        currency: rooms[0]?.currency || 'USD'
      }

    } catch (error: any) {
      throw new ProviderError(
        this.name,
        error.code || 'AVAILABILITY_ERROR',
        error.description || error.message || 'Failed to check availability',
        error
      )
    }
  }

  async createBooking(params: BookingParams): Promise<Booking> {
    try {
      // Amadeus Hotel Booking API
      const response = await this.client.booking.hotelBookings.post(
        JSON.stringify({
          data: {
            offerId: params.roomId,
            guests: [
              {
                name: {
                  firstName: params.guestDetails.firstName,
                  lastName: params.guestDetails.lastName
                },
                contact: {
                  phone: params.guestDetails.phone,
                  email: params.guestDetails.email
                }
              }
            ],
            payments: [
              {
                method: 'CREDIT_CARD',
                // Note: In production, you'd integrate with Stripe here
                // For now, this is a placeholder
              }
            ]
          }
        })
      )

      const bookingData = response.data?.[0]

      return {
        bookingId: '', // Will be set by our system
        providerBookingId: bookingData.id,
        status: bookingData.bookingStatus === 'CONFIRMED' ? 'confirmed' : 'pending',
        confirmationNumber: bookingData.associatedRecords?.[0]?.reference,
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
        error.description || error.message || 'Failed to create booking',
        error
      )
    }
  }

  async cancelBooking(providerBookingId: string): Promise<CancellationResult> {
    try {
      // Amadeus doesn't have a direct cancel API in the free tier
      // This would require hotel-specific cancellation policies
      // For MVP, we'll handle cancellations manually

      return {
        success: false,
        message: 'Cancellation must be handled through customer support'
      }

    } catch (error: any) {
      throw new ProviderError(
        this.name,
        error.code || 'CANCELLATION_ERROR',
        error.description || error.message || 'Failed to cancel booking',
        error
      )
    }
  }

  // Helper method to map Amadeus response to our HotelResult format
  private mapToHotelResult(amadeusHotel: any): HotelResult {
    const hotel = amadeusHotel.hotel
    const offer = amadeusHotel.offers?.[0] // Get cheapest offer
    const price = parseFloat(offer?.price?.total || '0')

    return {
      providerId: this.name,
      providerHotelId: hotel.hotelId,
      name: hotel.name,
      description: hotel.description?.text,
      address: `${hotel.address?.lines?.join(', ') || ''}, ${hotel.address?.cityName || ''}`,
      city: hotel.address?.cityName || '',
      state: hotel.address?.stateCode,
      country: hotel.address?.countryCode || '',
      latitude: hotel.latitude ? parseFloat(hotel.latitude) : undefined,
      longitude: hotel.longitude ? parseFloat(hotel.longitude) : undefined,
      starRating: hotel.rating ? parseInt(hotel.rating) : undefined,
      rating: hotel.rating ? parseFloat(hotel.rating) : undefined,
      price,
      currency: offer?.price?.currency || 'USD',
      pricePerNight: price / this.calculateNights(offer),
      images: hotel.media?.map((m: any) => m.uri) || [],
      amenities: hotel.amenities || [],
      available: amadeusHotel.available !== false,
      roomsAvailable: amadeusHotel.offers?.length || 0,
      metadata: {
        hotelId: hotel.hotelId,
        chainCode: hotel.chainCode,
        dupeId: hotel.dupeId,
        lastUpdate: hotel.lastUpdate,
        rawOffer: offer
      }
    }
  }

  private calculateNights(offer: any): number {
    if (!offer?.checkInDate || !offer?.checkOutDate) return 1
    const checkIn = new Date(offer.checkInDate)
    const checkOut = new Date(offer.checkOutDate)
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
    return nights || 1
  }
}
