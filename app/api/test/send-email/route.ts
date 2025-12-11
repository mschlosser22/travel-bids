import { NextRequest, NextResponse } from 'next/server'
import { sendBookingConfirmation } from '@/lib/email'
import { supabase } from '@/lib/supabase-server'

/**
 * Test endpoint to send booking confirmation email
 * Usage: POST /api/test/send-email with { bookingId: "xxx" }
 */
export async function POST(request: NextRequest) {
  try {
    const { bookingId } = await request.json()

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Missing bookingId' },
        { status: 400 }
      )
    }

    // Fetch booking from database
    const { data: booking, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single()

    if (error || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Send confirmation email (force to verified email in test mode)
    const result = await sendBookingConfirmation({
      bookingId: booking.id,
      guestName: booking.guest_name,
      guestEmail: 'ms122r4@gmail.com', // Use verified email for testing
      hotelName: booking.provider_hotel_id,
      checkInDate: booking.check_in_date,
      checkOutDate: booking.check_out_date,
      guestCount: booking.guest_count,
      roomCount: booking.room_count,
      totalPrice: Number(booking.total_price),
      specialRequests: booking.special_requests,
    })

    return NextResponse.json({
      success: true,
      message: 'Email sent',
      result,
      booking: {
        id: booking.id,
        guestEmail: booking.guest_email,
        guestName: booking.guest_name,
      }
    })

  } catch (error: any) {
    console.error('Test email error:', error)
    return NextResponse.json(
      { error: 'Failed to send email', message: error.message },
      { status: 500 }
    )
  }
}
