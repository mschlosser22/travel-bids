import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Use service role client for API routes (no auth context)
const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params

    // Fetch booking from database
    const { data: booking, error: dbError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single()

    if (dbError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        providerName: booking.provider_name,
        providerHotelId: booking.provider_hotel_id,
        providerBookingId: booking.provider_booking_id,
        checkInDate: booking.check_in_date,
        checkOutDate: booking.check_out_date,
        guestCount: booking.guest_count,
        roomCount: booking.room_count,
        guestName: booking.guest_name,
        guestEmail: booking.guest_email,
        guestPhone: booking.guest_phone,
        specialRequests: booking.special_requests,
        totalPrice: booking.total_price,
        status: booking.status,
        stripePaymentStatus: booking.stripe_payment_status,
        cancelledAt: booking.cancelled_at,
        refundAmount: booking.refund_amount,
        createdAt: booking.created_at,
        updatedAt: booking.updated_at,
      },
    })
  } catch (error: any) {
    console.error('Error fetching booking:', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch booking',
        message: error.message || 'Internal server error',
      },
      { status: 500 }
    )
  }
}
