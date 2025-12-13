// Real-time Hotel Price Search API
// Searches across all providers for a specific canonical hotel

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getProviderManager } from '@/lib/hotel-providers/provider-manager'
import type { SearchParams } from '@/lib/hotel-providers/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      canonicalHotelId,
      checkIn,
      checkOut,
      adults = 2,
      rooms = 1,
      utmSource,
      utmCampaign
    } = body

    if (!canonicalHotelId || !checkIn || !checkOut) {
      return NextResponse.json(
        { error: 'Missing required fields: canonicalHotelId, checkIn, checkOut' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // 1. Get canonical hotel and all provider mappings
    const { data: hotel, error: hotelError } = await supabase
      .from('canonical_hotels')
      .select(`
        id,
        name,
        city,
        latitude,
        longitude,
        giata_id,
        provider_mappings (
          provider_id,
          provider_hotel_id,
          include_in_ads
        )
      `)
      .eq('id', canonicalHotelId)
      .single()

    if (hotelError || !hotel) {
      return NextResponse.json(
        { error: 'Hotel not found' },
        { status: 404 }
      )
    }

    // 2. Check price cache first
    const { data: cachedPrices } = await supabase
      .from('hotel_price_cache')
      .select('prices, lowest_price, lowest_provider, cached_at')
      .eq('canonical_hotel_id', canonicalHotelId)
      .eq('check_in', checkIn)
      .eq('check_out', checkOut)
      .eq('adults', adults)
      .eq('rooms', rooms)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (cachedPrices) {
      // Return cached prices if fresh (< 5 min old)
      const cacheAge = Date.now() - new Date(cachedPrices.cached_at).getTime()
      if (cacheAge < 5 * 60 * 1000) {
        return NextResponse.json({
          prices: cachedPrices.prices,
          lowestPrice: cachedPrices.lowest_price,
          lowestProvider: cachedPrices.lowest_provider,
          cached: true
        })
      }
    }

    // 3. Search across providers in parallel
    const providerManager = getProviderManager()
    const searchResults = []

    // Build search params for each provider
    const mappings = hotel.provider_mappings || []

    for (const mapping of mappings) {
      const searchParams: SearchParams = {
        cityCode: hotel.city || 'NYC', // Fallback
        checkInDate: checkIn,
        checkOutDate: checkOut,
        adults,
        roomQuantity: rooms,
        hotelName: hotel.name,
        currency: 'USD'
      }

      try {
        // Search with this provider
        const results = await providerManager.search(
          searchParams,
          mapping.provider_id
        )

        // Find the matching hotel in results
        const matchingHotel = results.find(
          r => r.providerHotelId === mapping.provider_hotel_id
        )

        if (matchingHotel && matchingHotel.available) {
          searchResults.push({
            provider: mapping.provider_id,
            price: matchingHotel.price,
            pricePerNight: matchingHotel.pricePerNight,
            currency: matchingHotel.currency,
            available: matchingHotel.available,
            roomsAvailable: matchingHotel.roomsAvailable,
            providerHotelId: matchingHotel.providerHotelId
          })
        }
      } catch (error) {
        console.error(`Error searching ${mapping.provider_id}:`, error)
        // Continue with other providers
      }
    }

    // 4. Find lowest price
    const lowestResult = searchResults.reduce((lowest, current) => {
      return current.price < lowest.price ? current : lowest
    }, searchResults[0])

    // 5. Cache results for 10 minutes
    if (searchResults.length > 0) {
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

      await supabase
        .from('hotel_price_cache')
        .upsert({
          canonical_hotel_id: canonicalHotelId,
          check_in: checkIn,
          check_out: checkOut,
          adults,
          rooms,
          prices: searchResults,
          lowest_price: lowestResult.price,
          lowest_provider: lowestResult.provider,
          expires_at: expiresAt
        }, {
          onConflict: 'canonical_hotel_id,check_in,check_out,adults,rooms'
        })
    }

    // 6. Track search event for analytics
    // TODO: Log to events table with UTM params

    return NextResponse.json({
      prices: searchResults,
      lowestPrice: lowestResult?.price || null,
      lowestProvider: lowestResult?.provider || null,
      cached: false,
      searchedProviders: mappings.length,
      resultsFound: searchResults.length
    })

  } catch (error: any) {
    console.error('Price search error:', error)
    return NextResponse.json(
      { error: 'Failed to search prices', details: error.message },
      { status: 500 }
    )
  }
}
