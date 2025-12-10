import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      hotelId,
      roomId,
      providerId,
      checkInDate,
      checkOutDate,
      adults,
      rooms,
      guestDetails,
      totalPrice,
    } = body

    // Validate required fields
    if (!hotelId || !roomId || !providerId || !checkInDate || !checkOutDate || !guestDetails) {
      return NextResponse.json(
        { error: 'Missing required booking information' },
        { status: 400 }
      )
    }

    // Validate guest details
    if (!guestDetails.firstName || !guestDetails.lastName || !guestDetails.email || !guestDetails.phone) {
      return NextResponse.json(
        { error: 'Missing required guest information' },
        { status: 400 }
      )
    }

    // For MVP: Create booking in database with status 'pending'
    // In production with Stripe:
    // 1. Create booking with status 'pending'
    // 2. Process payment via Stripe
    // 3. Call provider's booking API (Amadeus)
    // 4. Update status to 'confirmed' after provider confirms
    // 5. Send confirmation email

    const { data: booking, error: dbError } = await supabase
      .from('bookings')
      .insert({
        provider_name: providerId,
        provider_hotel_id: hotelId,
        provider_room_id: roomId,
        check_in_date: checkInDate,
        check_out_date: checkOutDate,
        guest_count: adults || 2,
        room_count: rooms || 1,
        guest_name: `${guestDetails.firstName} ${guestDetails.lastName}`,
        guest_email: guestDetails.email,
        guest_phone: guestDetails.phone,
        special_requests: guestDetails.specialRequests || null,
        total_price: totalPrice || 0,
        status: 'pending', // Will be 'confirmed' after payment
        booking_metadata: {
          roomId,
          hotelId,
          providerId,
        },
      })
      .select()
      .single()

    if (dbError) {
      throw new Error(dbError.message)
    }

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      message: 'Booking created successfully',
    })

  } catch (error: any) {
    console.error('Booking creation error:', error)

    return NextResponse.json(
      {
        error: 'Failed to create booking',
        message: error.message || 'Internal server error',
      },
      { status: 500 }
    )
  }
}
