// Hotel Data Merging Strategy
// Intelligently combines data from multiple providers based on confidence scores

import type { HotelResult, HotelDetails } from '../hotel-providers/types'
import type { MatchResult } from './rag-matcher'

export interface UnifiedHotelListing {
  // Canonical identity
  canonicalId: string
  name: string

  // Pricing (always show cheapest)
  price: number
  originalPrice?: number // If there's a discount
  currency: string
  selectedProvider: {
    id: string
    name: string
    price: number
  }

  // Visual content (merged with attribution)
  images: Array<{
    url: string
    source: string
    isPrimary: boolean
  }>

  // Merged metadata
  description: string
  amenities: string[]
  starRating?: number

  // Transparency
  allOffers: Array<{
    providerId: string
    providerName: string
    price: number
    confidence: number
  }>

  // Attribution footer
  dataSources: {
    pricing: string
    images: string[]
    description: string[]
  }
}

export interface UnifiedHotelDetails extends UnifiedHotelListing {
  // Primary provider data (the one user is booking through)
  primaryProvider: string
  rooms: any[] // From primary provider only
  policies: any // From primary provider only

  // Address & location
  address: string
  city: string
  latitude?: number
  longitude?: number

  // Contact
  contactInfo?: {
    phone?: string
    email?: string
  }
}

interface ProviderHotelData {
  hotel: HotelResult
  match: MatchResult
  provider: {
    id: string
    name: string
  }
}

/**
 * Merge multiple provider results into unified hotel listing
 * Used for SEARCH RESULTS page
 */
export function mergeHotelListings(
  providers: ProviderHotelData[]
): UnifiedHotelListing {
  // Sort by price (cheapest first)
  const sortedByPrice = [...providers].sort(
    (a, b) => a.hotel.price - b.hotel.price
  )
  const cheapest = sortedByPrice[0]
  const primary = cheapest.hotel

  // Get high-confidence providers (can use their data)
  // GIATA match = automatic high confidence
  const highConfidence = providers.filter(p =>
    hasGiataMatch(p) || p.match.confidence >= 0.99
  )

  // PRICING: Always use cheapest
  const allOffers = sortedByPrice.map(p => ({
    providerId: p.provider.id,
    providerName: p.provider.name,
    price: p.hotel.price,
    confidence: p.match.confidence
  }))

  // IMAGES: Merge from high-confidence providers
  const images = mergeImages(highConfidence.map(p => p.hotel))

  // AMENITIES: Union from high-confidence providers
  const amenities = mergeAmenities(highConfidence.map(p => p.hotel))

  // DESCRIPTION: Use longest from high-confidence providers
  const description = mergeBestDescription(highConfidence.map(p => p.hotel))

  // ATTRIBUTION
  const dataSources = {
    pricing: cheapest.provider.name,
    images: [...new Set(images.map(i => i.source))],
    description: highConfidence
      .filter(p => p.hotel.description)
      .map(p => p.provider.name)
  }

  return {
    canonicalId: cheapest.match.canonicalId!,
    name: primary.name,
    price: primary.price,
    currency: primary.currency,
    selectedProvider: {
      id: cheapest.provider.id,
      name: cheapest.provider.name,
      price: cheapest.hotel.price
    },
    images,
    description,
    amenities,
    starRating: primary.starRating,
    allOffers,
    dataSources
  }
}

/**
 * Create detailed hotel view for HOTEL DETAILS page
 * Primarily uses selected provider's data, with optional enrichment
 */
export function mergeHotelDetails(
  primaryProvider: ProviderHotelData & { details: HotelDetails },
  otherProviders: ProviderHotelData[]
): UnifiedHotelDetails {
  const primary = primaryProvider.details
  const highConfidence = otherProviders.filter(
    p => p.match.confidence >= 0.99
  )

  // IMAGES: Primary provider's images first, then enrich
  const images = [
    // Primary provider images (marked as primary)
    ...primary.images.map(url => ({
      url,
      source: primaryProvider.provider.name,
      isPrimary: true
    })),
    // High-confidence provider images (if enabled)
    ...highConfidence.flatMap(p =>
      p.hotel.images.slice(0, 3).map(url => ({ // Max 3 per provider
        url,
        source: p.provider.name,
        isPrimary: false
      }))
    )
  ]

  // AMENITIES: Union from high-confidence providers
  const amenities = mergeAmenities([
    primary,
    ...highConfidence.map(p => p.hotel)
  ])

  // DESCRIPTION: Combine if high confidence
  const description = mergeDescriptions(
    primary.description || '',
    highConfidence.map(p => p.hotel.description || '')
  )

  // All offers (for price comparison widget)
  const allOffers = [
    {
      providerId: primaryProvider.provider.id,
      providerName: primaryProvider.provider.name,
      price: primary.price,
      confidence: 1.0
    },
    ...otherProviders.map(p => ({
      providerId: p.provider.id,
      providerName: p.provider.name,
      price: p.hotel.price,
      confidence: p.match.confidence
    }))
  ].sort((a, b) => a.price - b.price)

  return {
    canonicalId: primaryProvider.match.canonicalId!,
    name: primary.name,

    // Pricing
    price: primary.price,
    currency: primary.currency,
    selectedProvider: {
      id: primaryProvider.provider.id,
      name: primaryProvider.provider.name,
      price: primary.price
    },
    allOffers,

    // Content (merged)
    images,
    description,
    amenities,
    starRating: primary.starRating,

    // Primary provider only
    primaryProvider: primaryProvider.provider.id,
    rooms: primary.rooms, // NEVER merge rooms from different providers
    policies: primary.policies,

    // Location
    address: primary.address,
    city: primary.city,
    latitude: primary.latitude,
    longitude: primary.longitude,

    // Contact
    contactInfo: primary.contactInfo,

    // Attribution
    dataSources: {
      pricing: primaryProvider.provider.name,
      images: [...new Set(images.map(i => i.source))],
      description: [
        primaryProvider.provider.name,
        ...highConfidence
          .filter(p => p.hotel.description)
          .map(p => p.provider.name)
      ]
    }
  }
}

/**
 * Merge images from multiple providers
 * Deduplicates and maintains quality
 */
function mergeImages(hotels: HotelResult[]): Array<{
  url: string
  source: string
  isPrimary: boolean
}> {
  const seen = new Set<string>()
  const images: Array<{ url: string; source: string; isPrimary: boolean }> = []

  for (const hotel of hotels) {
    for (const url of hotel.images) {
      // Deduplicate by URL
      if (seen.has(url)) continue
      seen.add(url)

      images.push({
        url,
        source: hotel.providerId,
        isPrimary: hotel === hotels[0] // First hotel is primary
      })
    }
  }

  return images
}

/**
 * Merge amenities from multiple providers
 * Returns union of all amenities
 */
function mergeAmenities(hotels: HotelResult[]): string[] {
  const amenitySet = new Set<string>()

  for (const hotel of hotels) {
    for (const amenity of hotel.amenities) {
      // Normalize amenity names
      const normalized = normalizeAmenity(amenity)
      amenitySet.add(normalized)
    }
  }

  return Array.from(amenitySet).sort()
}

/**
 * Normalize amenity names to avoid duplicates
 */
function normalizeAmenity(amenity: string): string {
  // Convert to title case and remove extra whitespace
  return amenity
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, l => l.toUpperCase())
}

/**
 * Get best description from multiple providers
 */
function mergeBestDescription(hotels: HotelResult[]): string {
  const descriptions = hotels
    .map(h => h.description || '')
    .filter(d => d.length > 0)

  if (descriptions.length === 0) return ''

  // Return longest description (usually most detailed)
  return descriptions.sort((a, b) => b.length - a.length)[0]
}

/**
 * Combine descriptions from multiple providers
 * Only if high confidence match
 */
function mergeDescriptions(
  primary: string,
  others: string[]
): string {
  if (!primary) return mergeBestDescription(others as any)

  // For now, just use primary
  // Could enhance to combine unique information from others
  return primary
}

/**
 * Configuration for data merging rules
 */
export const MERGE_CONFIG = {
  // GIATA code match = 100% confidence (industry standard)
  USE_GIATA_FOR_IMAGES: true,

  // Minimum RAG confidence to use provider's data (if no GIATA)
  IMAGE_CONFIDENCE_THRESHOLD: 0.99,
  AMENITY_CONFIDENCE_THRESHOLD: 0.99,
  DESCRIPTION_CONFIDENCE_THRESHOLD: 0.99,

  // Maximum images to show from non-primary providers
  MAX_IMAGES_PER_PROVIDER: 3,

  // Show price comparison if within X% of cheapest
  PRICE_COMPARISON_THRESHOLD: 0.10, // 10%
}

/**
 * Check if providers have matching GIATA code (100% confidence)
 */
function hasGiataMatch(provider: ProviderHotelData): boolean {
  if (!MERGE_CONFIG.USE_GIATA_FOR_IMAGES) return false

  const giataId = provider.hotel.metadata?.giataId
  return !!giataId // If GIATA ID exists, it's a verified match
}

/**
 * Check if all providers share the same GIATA code
 */
export function allHaveMatchingGiata(providers: ProviderHotelData[]): boolean {
  if (providers.length < 2) return false

  const giataIds = providers
    .map(p => p.hotel.metadata?.giataId)
    .filter(Boolean)

  if (giataIds.length === 0) return false

  // All GIATA IDs must be the same
  const first = giataIds[0]
  return giataIds.every(id => id === first)
}

/**
 * Determine if we should show price comparison widget
 */
export function shouldShowPriceComparison(offers: any[]): boolean {
  if (offers.length < 2) return false

  const cheapest = offers[0].price
  const mostExpensive = offers[offers.length - 1].price
  const difference = (mostExpensive - cheapest) / cheapest

  return difference >= MERGE_CONFIG.PRICE_COMPARISON_THRESHOLD
}
