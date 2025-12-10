// LLM-Friendly URL Structure Helpers
// Makes URLs semantic, readable, and easy for AI agents to parse and generate

/**
 * City code to readable name mapping
 * Used for generating human/LLM-readable URLs
 */
export const CITY_NAMES: Record<string, string> = {
  NYC: 'new-york',
  LON: 'london',
  PAR: 'paris',
  LAX: 'los-angeles',
  MIA: 'miami',
  LAS: 'las-vegas',
  CHI: 'chicago',
  SFO: 'san-francisco',
  DXB: 'dubai',
  TYO: 'tokyo',
  SYD: 'sydney',
  ROM: 'rome',
  BCN: 'barcelona',
  AMS: 'amsterdam',
  BER: 'berlin',
  MAD: 'madrid',
  IST: 'istanbul',
  BKK: 'bangkok',
  SIN: 'singapore',
  HKG: 'hong-kong',
}

/**
 * Reverse mapping: readable name to city code
 */
export const CITY_CODES: Record<string, string> = Object.fromEntries(
  Object.entries(CITY_NAMES).map(([code, name]) => [name, code])
)

/**
 * Generate search URL: /search/{city}/{check-in}/{check-out}/{guests}-guests-{rooms}-rooms
 */
export function buildSearchUrl(params: {
  cityCode: string
  checkInDate: string
  checkOutDate: string
  adults: number
  rooms: number
}): string {
  const cityName = CITY_NAMES[params.cityCode] || params.cityCode.toLowerCase()
  return `/search/${cityName}/${params.checkInDate}/${params.checkOutDate}/${params.adults}-guests-${params.rooms}-rooms`
}

/**
 * Parse search URL parameters from path segments
 */
export function parseSearchUrl(segments: {
  city: string
  checkIn: string
  checkOut: string
  guestsRooms: string
}): {
  cityCode: string
  checkInDate: string
  checkOutDate: string
  adults: number
  rooms: number
} | null {
  try {
    // Parse city
    const cityCode = CITY_CODES[segments.city] || segments.city.toUpperCase()

    // Parse check-in/check-out
    const checkInDate = segments.checkIn
    const checkOutDate = segments.checkOut

    // Parse guests and rooms from format: "2-guests-1-room" or "2-guests-1-rooms"
    const match = segments.guestsRooms.match(/^(\d+)-guests?-(\d+)-rooms?$/)
    if (!match) {
      console.error('Failed to parse guestsRooms:', segments.guestsRooms)
      return null
    }

    const adults = parseInt(match[1])
    const rooms = parseInt(match[2])

    return {
      cityCode,
      checkInDate,
      checkOutDate,
      adults,
      rooms,
    }
  } catch (error) {
    return null
  }
}

/**
 * Generate hotel slug from hotel name
 * Example: "The Savoy Hotel" → "the-savoy-hotel"
 */
export function createHotelSlug(hotelName: string): string {
  return hotelName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100) // Max length
}

/**
 * Generate hotel detail URL: /hotel/{city}/{hotel-slug}/{hotel-id}
 */
export function buildHotelUrl(params: {
  cityCode: string
  hotelName: string
  providerHotelId: string
  providerId: string
  checkInDate: string
  checkOutDate: string
  adults: number
  rooms: number
}): string {
  const cityName = CITY_NAMES[params.cityCode] || params.cityCode.toLowerCase()
  const slug = createHotelSlug(params.hotelName)

  // Include search params as query string for context
  const searchParams = new URLSearchParams({
    provider: params.providerId,
    checkIn: params.checkInDate,
    checkOut: params.checkOutDate,
    adults: params.adults.toString(),
    rooms: params.rooms.toString(),
  })

  return `/hotel/${cityName}/${slug}/${params.providerHotelId}?${searchParams.toString()}`
}

/**
 * Parse hotel URL parameters
 */
export function parseHotelUrl(segments: {
  city: string
  slug: string
  hotelId: string
}): {
  cityCode: string
  slug: string
  providerHotelId: string
} | null {
  try {
    const cityCode = CITY_CODES[segments.city] || segments.city.toUpperCase()

    return {
      cityCode,
      slug: segments.slug,
      providerHotelId: segments.hotelId,
    }
  } catch (error) {
    return null
  }
}

/**
 * Generate booking URL: /book/{hotel-id}/{room-id}
 */
export function buildBookingUrl(params: {
  providerHotelId: string
  roomId: string
  providerId: string
  checkInDate: string
  checkOutDate: string
  adults: number
  rooms: number
}): string {
  const searchParams = new URLSearchParams({
    provider: params.providerId,
    checkIn: params.checkInDate,
    checkOut: params.checkOutDate,
    adults: params.adults.toString(),
    rooms: params.rooms.toString(),
  })

  return `/book/${params.providerHotelId}/${params.roomId}?${searchParams.toString()}`
}

/**
 * Generate booking confirmation URL: /booking/{booking-id}
 */
export function buildConfirmationUrl(bookingId: string): string {
  return `/booking/${bookingId}`
}

/**
 * Validate date format (YYYY-MM-DD)
 */
export function isValidDate(dateString: string): boolean {
  const match = dateString.match(/^\d{4}-\d{2}-\d{2}$/)
  if (!match) return false

  const date = new Date(dateString)
  return date instanceof Date && !isNaN(date.getTime())
}

/**
 * Format date for display
 */
export function formatDateDisplay(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Calculate number of nights between two dates
 */
export function calculateNights(checkIn: string, checkOut: string): number {
  const checkInDate = new Date(checkIn)
  const checkOutDate = new Date(checkOut)
  return Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
}
