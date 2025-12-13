// Hotel Provider Abstraction Layer
// Unified interface for all hotel inventory providers (Amadeus, Booking.com, Expedia, etc.)

export interface SearchParams {
  cityCode: string           // IATA city code (e.g., "NYC", "LON")
  checkInDate: string         // YYYY-MM-DD
  checkOutDate: string        // YYYY-MM-DD
  adults: number              // Number of adult guests
  roomQuantity?: number       // Number of rooms (default: 1)
  currency?: string           // Currency code (default: USD)
  hotelName?: string          // Optional: for targeted ad campaigns
  radius?: number             // Search radius in km
  radiusUnit?: 'KM' | 'MILE'
}

export interface HotelResult {
  // Provider info
  providerId: string          // "amadeus", "booking", "expedia"
  providerHotelId: string     // Provider's internal hotel ID

  // Basic info
  name: string
  description?: string
  address: string
  city: string
  state?: string
  country: string
  latitude?: number
  longitude?: number

  // Rating & classification
  starRating?: number         // 1-5 stars
  rating?: number             // Customer rating (e.g., 4.5/5)
  reviewCount?: number

  // Pricing
  price: number               // Total price for the stay
  currency: string
  pricePerNight?: number

  // Media
  images: string[]            // Image URLs

  // Amenities
  amenities: string[]

  // Availability
  available: boolean
  roomsAvailable?: number

  // Provider-specific data
  metadata: Record<string, any>
}

export interface HotelDetails extends HotelResult {
  // Additional details only available on detail page
  rooms: RoomOffer[]
  policies?: {
    checkIn?: string          // Check-in time
    checkOut?: string         // Check-out time
    cancellation?: string     // Cancellation policy
    deposit?: string          // Deposit policy
  }
  contactInfo?: {
    phone?: string
    email?: string
    website?: string
  }
}

export interface RoomOffer {
  roomId: string
  roomType: string
  description?: string
  maxOccupancy: number
  bedType?: string
  price: number
  currency: string
  available: boolean
  amenities: string[]
  images?: string[]
  metadata: Record<string, any>
}

export interface AvailabilityParams {
  hotelId: string             // Our internal hotel ID
  providerHotelId: string     // Provider's hotel ID
  checkInDate: string
  checkOutDate: string
  adults: number
  roomQuantity?: number
}

export interface Availability {
  available: boolean
  rooms: RoomOffer[]
  totalPrice: number
  currency: string
}

export interface BookingParams {
  hotelId: string
  providerHotelId: string
  roomId: string
  checkInDate: string
  checkOutDate: string
  guests: {
    adults: number
    children?: number
  }
  guestDetails: {
    firstName: string
    lastName: string
    email: string
    phone: string
  }
  paymentInfo?: {
    token: string             // Stripe token or similar
  }
  totalPrice: number
  currency: string
  metadata?: Record<string, any>  // Provider-specific metadata (e.g., rateKey for HotelBeds)
}

export interface Booking {
  bookingId: string           // Our internal booking ID
  providerBookingId: string   // Provider's confirmation number
  status: 'pending' | 'confirmed' | 'cancelled'
  confirmationNumber?: string
  hotelName: string
  checkInDate: string
  checkOutDate: string
  totalPrice: number
  currency: string
  metadata: Record<string, any>
}

export interface CancellationResult {
  success: boolean
  refundAmount?: number
  refundCurrency?: string
  message?: string
}

// Main provider interface
export interface HotelProvider {
  readonly name: string       // "amadeus", "booking", "expedia"

  // Search for hotels
  search(params: SearchParams): Promise<HotelResult[]>

  // Get detailed hotel information
  getDetails(providerHotelId: string, params: SearchParams): Promise<HotelDetails>

  // Check real-time availability
  checkAvailability(params: AvailabilityParams): Promise<Availability>

  // Create a booking
  createBooking(params: BookingParams): Promise<Booking>

  // Cancel a booking
  cancelBooking(providerBookingId: string): Promise<CancellationResult>
}

// Provider-specific errors
export class ProviderError extends Error {
  constructor(
    public provider: string,
    public code: string,
    message: string,
    public originalError?: any
  ) {
    super(`[${provider}] ${message}`)
    this.name = 'ProviderError'
  }
}
