import { NextRequest, NextResponse } from 'next/server'
import { getProviderManager } from '@/lib/hotel-providers'
import type { SearchParams, HotelResult } from '@/lib/hotel-providers/types'
import { matchHotel, createCanonicalHotel } from '@/lib/hotel-matching/rag-matcher'
import { mergeHotelListings, type UnifiedHotelListing } from '@/lib/hotel-matching/data-merger'
import type { MatchResult } from '@/lib/hotel-matching/rag-matcher'

/**
 * Match hotels to canonical database and deduplicate
 */
async function matchAndDeduplicateHotels(
  hotels: HotelResult[]
): Promise<UnifiedHotelListing[]> {
  // Match each hotel to canonical database
  const matchPromises = hotels.map(async (hotel) => {
    const match = await matchHotel(hotel)

    // If no match found and confidence is low, create new canonical hotel
    if (!match.canonicalId && hotel.latitude && hotel.longitude) {
      try {
        const canonicalId = await createCanonicalHotel(hotel)
        return {
          hotel,
          match: { ...match, canonicalId, confidence: 1.0, shouldAdvertise: true }
        }
      } catch (error) {
        console.error('Failed to create canonical hotel:', error)
        return { hotel, match }
      }
    }

    return { hotel, match }
  })

  const matched = await Promise.all(matchPromises)

  // Group hotels by canonical ID
  const hotelsByCanonicalId = new Map<string, Array<{
    hotel: HotelResult
    match: MatchResult
    provider: { id: string; name: string }
  }>>()

  for (const { hotel, match } of matched) {
    // Skip hotels without canonical ID (couldn't match or create)
    if (!match.canonicalId) {
      console.log(`⚠️  Skipping hotel ${hotel.name} - no canonical match`)
      continue
    }

    // Only include hotels we're confident about for advertising
    // (This is critical for Google Ads - we only advertise 99%+ matches)
    if (!match.shouldAdvertise) {
      console.log(`⚠️  Skipping hotel ${hotel.name} - low confidence (${(match.confidence * 100).toFixed(1)}%)`)
      continue
    }

    if (!hotelsByCanonicalId.has(match.canonicalId)) {
      hotelsByCanonicalId.set(match.canonicalId, [])
    }

    hotelsByCanonicalId.get(match.canonicalId)!.push({
      hotel,
      match,
      provider: {
        id: hotel.providerId,
        name: hotel.providerId // In future, map to friendly name
      }
    })
  }

  // Merge data for each canonical hotel
  const mergedHotels: UnifiedHotelListing[] = []

  for (const canonicalId of Array.from(hotelsByCanonicalId.keys())) {
    const providers = hotelsByCanonicalId.get(canonicalId)!
    try {
      const merged = mergeHotelListings(providers)
      mergedHotels.push(merged)
    } catch (error) {
      console.error(`Failed to merge hotel ${canonicalId}:`, error)
      // Skip this hotel if merging fails
    }
  }

  // Sort by price (cheapest first)
  mergedHotels.sort((a, b) => a.price - b.price)

  console.log(`✅ Matched ${hotels.length} provider results → ${mergedHotels.length} unique hotels`)

  return mergedHotels
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required parameters
    const { cityCode, checkInDate, checkOutDate, adults, roomQuantity, currency } = body

    if (!cityCode || !checkInDate || !checkOutDate) {
      return NextResponse.json(
        { error: 'Missing required parameters: cityCode, checkInDate, checkOutDate' },
        { status: 400 }
      )
    }

    // Validate dates
    const checkIn = new Date(checkInDate)
    const checkOut = new Date(checkOutDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (checkIn < today) {
      return NextResponse.json(
        { error: 'Check-in date must be today or in the future' },
        { status: 400 }
      )
    }

    if (checkOut <= checkIn) {
      return NextResponse.json(
        { error: 'Check-out date must be after check-in date' },
        { status: 400 }
      )
    }

    // Build search parameters
    const searchParams: SearchParams = {
      cityCode,
      checkInDate,
      checkOutDate,
      adults: adults || 2,
      roomQuantity: roomQuantity || 1,
      currency: currency || 'USD'
    }

    // Search hotels using provider manager (all providers)
    const providerResults = await getProviderManager().search(searchParams)

    // Match and deduplicate hotels
    const matchedHotels = await matchAndDeduplicateHotels(providerResults)

    return NextResponse.json({
      success: true,
      hotels: matchedHotels,
      count: matchedHotels.length,
      metadata: {
        totalProviderResults: providerResults.length,
        deduplicatedTo: matchedHotels.length
      }
    })

  } catch (error: any) {
    console.error('Hotel search API error:', error)

    return NextResponse.json(
      {
        error: 'Failed to search hotels',
        message: error.message || 'Internal server error'
      },
      { status: 500 }
    )
  }
}
