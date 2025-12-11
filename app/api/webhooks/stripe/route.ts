import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { sendBookingConfirmation } from '@/lib/email'

// Use service role client for webhook handlers (no auth context)
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

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message)
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 }
      )
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        // Get booking ID from metadata
        const bookingId = session.metadata?.bookingId

        if (!bookingId) {
          console.error('No booking ID in session metadata')
          break
        }

        // Update booking status in database
        const { data: booking, error: updateError } = await supabase
          .from('bookings')
          .update({
            status: 'confirmed',
            stripe_payment_intent_id: session.payment_intent as string,
            stripe_payment_status: session.payment_status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', bookingId)
          .select()
          .single()

        if (updateError) {
          console.error('Failed to update booking:', updateError)
          return NextResponse.json(
            { error: 'Failed to update booking' },
            { status: 500 }
          )
        }

        console.log(`✅ Booking ${bookingId} confirmed - Payment succeeded`)

        // Send confirmation email
        if (booking) {
          await sendBookingConfirmation({
            bookingId: booking.id,
            guestName: booking.guest_name,
            guestEmail: booking.guest_email,
            hotelName: booking.provider_hotel_id, // Will be improved when we store hotel name
            checkInDate: booking.check_in_date,
            checkOutDate: booking.check_out_date,
            guestCount: booking.guest_count,
            roomCount: booking.room_count,
            totalPrice: Number(booking.total_price),
            specialRequests: booking.special_requests,
          })
        }
        break
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session
        const bookingId = session.metadata?.bookingId

        if (bookingId) {
          // Optionally update booking to show payment expired
          console.log(`⏰ Payment session expired for booking ${bookingId}`)
        }
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.error('❌ Payment failed:', paymentIntent.id)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error: any) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed', message: error.message },
      { status: 500 }
    )
  }
}
