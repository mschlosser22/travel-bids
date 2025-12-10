import { NextRequest, NextResponse } from 'next/server'
import { cacheOffer, getCachedOffer } from '@/lib/offer-cache'

// POST: Cache an offer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { providerId, providerHotelId, room, searchParams, hotelInfo } = body

    const cacheKey = await cacheOffer(
      providerId,
      providerHotelId,
      room,
      searchParams,
      hotelInfo
    )

    return NextResponse.json({ cacheKey })
  } catch (error: any) {
    console.error('[API] Error caching offer:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to cache offer' },
      { status: 500 }
    )
  }
}

// GET: Retrieve a cached offer
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cacheKey = searchParams.get('key')

    if (!cacheKey) {
      return NextResponse.json(
        { error: 'Cache key is required' },
        { status: 400 }
      )
    }

    const cachedOffer = await getCachedOffer(cacheKey)

    if (!cachedOffer) {
      return NextResponse.json(
        { error: 'Offer not found or expired' },
        { status: 404 }
      )
    }

    return NextResponse.json({ offer: cachedOffer })
  } catch (error: any) {
    console.error('[API] Error retrieving cached offer:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve cached offer' },
      { status: 500 }
    )
  }
}
