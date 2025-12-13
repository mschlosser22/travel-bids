// Hotel Deduplication & Content Aggregation
// Combines results from multiple providers into unified hotel listings

import type { HotelResult } from './hotel-providers/types'

export interface UnifiedHotel {
  // Canonical identifiers
  canonicalId: string          // Our internal ID (giataId or generated hash)
  giataId?: string            // Industry standard ID
  name: string

  // Aggregated content (best from all providers)
  description: string
  address: string
  city: string
  state?: string
  country: string
  latitude?: number
  longitude?: number

  // Ratings (averaged or highest)
  starRating?: number
  rating?: number
  reviewCount?: number

  // Media (merged from all providers)
  images: string[]
  amenities: string[]

  // Price comparison - show all provider offers
  lowestPrice: number
  currency: string
  offers: Array<{
    providerId: string
    providerHotelId: string
    price: number
    pricePerNight: number
    roomsAvailable: number
    metadata: any
  }>
}

/**
 * Deduplicate and merge hotel results from multiple providers
 */
export function deduplicateHotels(results: HotelResult[]): UnifiedHotel[] {
  const hotelMap = new Map<string, HotelResult[]>()

  // Group hotels by canonical ID
  for (const hotel of results) {
    const canonicalId = getCanonicalId(hotel)

    if (!hotelMap.has(canonicalId)) {
      hotelMap.set(canonicalId, [])
    }
    hotelMap.get(canonicalId)!.push(hotel)
  }

  // Merge each group into unified hotel
  return Array.from(hotelMap.entries()).map(([canonicalId, hotels]) =>
    mergeHotelData(canonicalId, hotels)
  )
}

/**
 * Get canonical ID for a hotel
 * Priority: giataId > dupeId > fuzzy match hash
 */
function getCanonicalId(hotel: HotelResult): string {
  // Check for Giata ID in metadata
  if (hotel.metadata?.giataId) {
    return `giata:${hotel.metadata.giataId}`
  }

  // Check for Amadeus dupeId
  if (hotel.metadata?.dupeId) {
    return `amadeus:${hotel.metadata.dupeId}`
  }

  // Fallback: Create hash from name + location
  return createFuzzyHash(hotel)
}

/**
 * Create fuzzy matching hash based on hotel characteristics
 */
function createFuzzyHash(hotel: HotelResult): string {
  const normalizedName = hotel.name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 30)

  const lat = hotel.latitude ? Math.round(hotel.latitude * 100) : 0
  const lon = hotel.longitude ? Math.round(hotel.longitude * 100) : 0

  return `fuzzy:${normalizedName}:${lat}:${lon}`
}

/**
 * Merge multiple hotel results into single unified hotel
 */
function mergeHotelData(canonicalId: string, hotels: HotelResult[]): UnifiedHotel {
  // Sort by data quality (prefer providers with more complete data)
  const sortedHotels = hotels.sort((a, b) =>
    getDataQualityScore(b) - getDataQualityScore(a)
  )

  const primary = sortedHotels[0]

  // Merge images from all providers (unique URLs only)
  const allImages = new Set<string>()
  for (const hotel of hotels) {
    hotel.images.forEach(img => allImages.add(img))
  }

  // Merge amenities (unique only)
  const allAmenities = new Set<string>()
  for (const hotel of hotels) {
    hotel.amenities.forEach(amenity => allAmenities.add(amenity))
  }

  // Get best description (longest non-empty)
  const description = hotels
    .map(h => h.description || '')
    .filter(d => d.length > 0)
    .sort((a, b) => b.length - a.length)[0] || ''

  // Find lowest price
  const prices = hotels.map(h => h.price).filter(p => p > 0)
  const lowestPrice = prices.length > 0 ? Math.min(...prices) : 0

  // Create offer comparison
  const offers = hotels.map(hotel => ({
    providerId: hotel.providerId,
    providerHotelId: hotel.providerHotelId,
    price: hotel.price,
    pricePerNight: hotel.pricePerNight || hotel.price,
    roomsAvailable: hotel.roomsAvailable || 0,
    metadata: hotel.metadata
  }))

  // Sort offers by price (lowest first)
  offers.sort((a, b) => a.price - b.price)

  return {
    canonicalId,
    giataId: primary.metadata?.giataId,
    name: primary.name,
    description,
    address: primary.address,
    city: primary.city,
    state: primary.state,
    country: primary.country,
    latitude: primary.latitude,
    longitude: primary.longitude,
    starRating: primary.starRating,
    rating: calculateAverageRating(hotels),
    reviewCount: hotels.reduce((sum, h) => sum + (h.reviewCount || 0), 0),
    images: Array.from(allImages),
    amenities: Array.from(allAmenities).sort(),
    lowestPrice,
    currency: primary.currency,
    offers
  }
}

/**
 * Calculate data quality score to determine primary provider
 */
function getDataQualityScore(hotel: HotelResult): number {
  let score = 0

  if (hotel.description && hotel.description.length > 50) score += 3
  if (hotel.images.length > 0) score += 2
  if (hotel.images.length > 3) score += 2
  if (hotel.amenities.length > 0) score += 1
  if (hotel.amenities.length > 5) score += 2
  if (hotel.starRating) score += 1
  if (hotel.rating) score += 1
  if (hotel.latitude && hotel.longitude) score += 1

  return score
}

/**
 * Calculate average rating from all providers
 */
function calculateAverageRating(hotels: HotelResult[]): number | undefined {
  const ratings = hotels
    .map(h => h.rating)
    .filter((r): r is number => r !== undefined)

  if (ratings.length === 0) return undefined

  const avg = ratings.reduce((sum, r) => sum + r, 0) / ratings.length
  return Math.round(avg * 10) / 10 // Round to 1 decimal
}

/**
 * Check if two hotels are likely the same property
 * Used for fuzzy matching when no canonical IDs available
 */
export function areHotelsSame(hotel1: HotelResult, hotel2: HotelResult): boolean {
  // Exact name match (case insensitive)
  const name1 = hotel1.name.toLowerCase().trim()
  const name2 = hotel2.name.toLowerCase().trim()

  if (name1 === name2) {
    // Check if within 100m radius
    if (hotel1.latitude && hotel1.longitude && hotel2.latitude && hotel2.longitude) {
      const distance = calculateDistance(
        hotel1.latitude, hotel1.longitude,
        hotel2.latitude, hotel2.longitude
      )
      return distance < 0.1 // 100 meters
    }

    // Or same city + address contains similar strings
    if (hotel1.city.toLowerCase() === hotel2.city.toLowerCase()) {
      const addr1 = hotel1.address.toLowerCase()
      const addr2 = hotel2.address.toLowerCase()
      return addr1.includes(addr2.substring(0, 10)) || addr2.includes(addr1.substring(0, 10))
    }
  }

  // Levenshtein distance for similar names
  if (hotel1.city === hotel2.city) {
    const similarity = getStringSimilarity(name1, name2)
    if (similarity > 0.85) { // 85% similar
      return true
    }
  }

  return false
}

/**
 * Calculate distance between two GPS coordinates (in km)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth radius in km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Calculate string similarity (simplified Levenshtein)
 */
function getStringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1

  if (longer.length === 0) return 1.0

  const editDistance = levenshteinDistance(longer, shorter)
  return (longer.length - editDistance) / longer.length
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }

  return matrix[str2.length][str1.length]
}
