import { NextRequest, NextResponse } from 'next/server'
import { getProviderManager } from '@/lib/hotel-providers'
import type { SearchParams } from '@/lib/hotel-providers/types'

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

    // Search hotels using provider manager
    const hotels = await getProviderManager().search(searchParams)

    return NextResponse.json({
      success: true,
      hotels,
      count: hotels.length
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
