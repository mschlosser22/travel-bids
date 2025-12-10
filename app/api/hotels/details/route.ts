import { NextRequest, NextResponse } from 'next/server'
import { providerManager } from '@/lib/hotel-providers'
import type { SearchParams } from '@/lib/hotel-providers/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required parameters
    const {
      providerHotelId,
      providerId,
      cityCode,
      checkInDate,
      checkOutDate,
      adults,
      roomQuantity,
      currency
    } = body

    if (!providerHotelId || !providerId || !checkInDate || !checkOutDate) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
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

    // Build search parameters for hotel details
    const searchParams: SearchParams = {
      cityCode: cityCode || 'LON',
      checkInDate,
      checkOutDate,
      adults: adults || 2,
      roomQuantity: roomQuantity || 1,
      currency: currency || 'USD'
    }

    // Get hotel details from provider
    const hotelDetails = await providerManager.getDetails(
      providerId,
      providerHotelId,
      searchParams
    )

    return NextResponse.json({
      success: true,
      hotel: hotelDetails
    })

  } catch (error: any) {
    console.error('Hotel details API error:', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch hotel details',
        message: error.message || 'Internal server error'
      },
      { status: 500 }
    )
  }
}
