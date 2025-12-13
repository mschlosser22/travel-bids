import { NextRequest, NextResponse } from 'next/server'
import { searchCities, getCityByCode, type City } from '@/lib/data/cities'
import Amadeus from 'amadeus'
import { kv } from '@vercel/kv'

export const runtime = 'edge'
export const revalidate = 2592000 // 30 days

/**
 * City search API with static data + Amadeus fallback
 *
 * Strategy:
 * 1. Search static database first (instant, free)
 * 2. If no results, query Amadeus API (costs money, slower)
 * 3. Cache Amadeus results in Vercel KV for 30 days
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')
  const limit = parseInt(searchParams.get('limit') || '10')

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] })
  }

  // First, search static database
  const staticResults = searchCities(query, limit)

  if (staticResults.length > 0) {
    return NextResponse.json({
      results: staticResults,
      source: 'cache'
    })
  }

  // No results in static DB - try Vercel KV cache
  const cacheKey = `city:${query.toLowerCase()}`

  try {
    const cachedResults = await kv.get<City[]>(cacheKey)

    if (cachedResults) {
      return NextResponse.json({
        results: cachedResults.slice(0, limit),
        source: 'kv-cache'
      })
    }
  } catch (error) {
    console.error('KV cache error:', error)
  }

  // Still no results - query Amadeus API (fallback for exotic cities)
  try {
    const amadeus = new Amadeus({
      clientId: process.env.AMADEUS_API_KEY!,
      clientSecret: process.env.AMADEUS_API_SECRET!,
      hostname: process.env.AMADEUS_ENVIRONMENT === 'production' ? 'production' : 'test'
    })

    const response = await amadeus.referenceData.locations.get({
      keyword: query,
      subType: 'CITY',
      'page[limit]': limit
    })

    if (response.data && response.data.length > 0) {
      const cities: City[] = response.data.map((city: any) => ({
        name: city.address.cityName,
        iataCode: city.iataCode,
        latitude: city.geoCode.latitude,
        longitude: city.geoCode.longitude,
        countryCode: city.address.countryCode
      }))

      // Cache in Vercel KV for 30 days
      try {
        await kv.set(cacheKey, cities, { ex: 2592000 })
      } catch (error) {
        console.error('Failed to cache in KV:', error)
      }

      return NextResponse.json({
        results: cities,
        source: 'amadeus-api'
      })
    }

    return NextResponse.json({ results: [], source: 'no-results' })

  } catch (error) {
    console.error('Amadeus API error:', error)

    // Return empty results instead of 500 error
    // This prevents autocomplete UI from breaking
    return NextResponse.json({
      results: [],
      source: 'error',
      error: 'Amadeus API unavailable'
    })
  }
}
