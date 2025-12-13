import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { sendBookingConfirmation } from '@/lib/email'
import { getProviderManager } from '@/lib/hotel-providers'

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

/**
 * CRITICAL: This webhook creates the ACTUAL booking with the hotel provider
 * NEVER create database booking records without provider confirmation
 * Flow: Payment succeeds → Create provider booking → Save provider_booking_id
 */

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

        // Fetch the pending booking from database
        const { data: booking, error: fetchError } = await supabase
          .from('bookings')
          .select('*')
          .eq('id', bookingId)
          .single()

        if (fetchError || !booking) {
          console.error('Failed to fetch booking:', fetchError)
          return NextResponse.json(
            { error: 'Booking not found' },
            { status: 404 }
          )
        }

        console.log(`💳 Payment succeeded for booking ${bookingId}. Creating provider booking...`)

        try {
          // CRITICAL: Create booking with actual hotel provider
          const providerManager = getProviderManager()
          const provider = providerManager.getProvider(booking.provider_name)

          if (!provider) {
            throw new Error(`Provider ${booking.provider_name} not found`)
          }

          // Parse guest name
          const [firstName, ...lastNameParts] = booking.guest_name.split(' ')
          const lastName = lastNameParts.join(' ') || firstName

          // Call provider API to create REAL booking
          const providerBooking = await provider.createBooking({
            hotelId: booking.provider_hotel_id,
            providerHotelId: booking.provider_hotel_id,
            roomId: booking.provider_room_id,
            checkInDate: booking.check_in_date,
            checkOutDate: booking.check_out_date,
            guests: {
              adults: booking.guest_count,
              children: 0
            },
            guestDetails: {
              firstName,
              lastName,
              email: booking.guest_email,
              phone: booking.guest_phone
            },
            totalPrice: Number(booking.total_price),
            currency: 'USD'
          })

          console.log(`✅ Provider booking created: ${providerBooking.providerBookingId}`)

          // Update database with provider booking ID
          const { data: updatedBooking, error: updateError } = await supabase
            .from('bookings')
            .update({
              status: 'confirmed',
              provider_booking_id: providerBooking.providerBookingId,
              stripe_payment_intent_id: session.payment_intent as string,
              stripe_payment_status: session.payment_status,
              booking_metadata: {
                ...booking.booking_metadata,
                providerConfirmation: providerBooking.confirmationNumber,
                providerStatus: providerBooking.status,
                providerMetadata: providerBooking.metadata
              },
              updated_at: new Date().toISOString(),
            })
            .eq('id', bookingId)
            .select()
            .single()

          if (updateError) {
            console.error('Failed to update booking:', updateError)
            // Critical: We have provider booking but failed to save it
            // Log for manual reconciliation
            console.error(`🚨 CRITICAL: Provider booking ${providerBooking.providerBookingId} created but DB update failed for ${bookingId}`)
            return NextResponse.json(
              { error: 'Failed to save provider booking' },
              { status: 500 }
            )
          }

          console.log(`✅ Booking ${bookingId} fully confirmed with provider`)

          // Send confirmation email
          await sendBookingConfirmation({
            bookingId: updatedBooking.id,
            guestName: updatedBooking.guest_name,
            guestEmail: updatedBooking.guest_email,
            hotelName: updatedBooking.hotel_name || updatedBooking.provider_hotel_id || 'Your Hotel',
            checkInDate: updatedBooking.check_in_date,
            checkOutDate: updatedBooking.check_out_date,
            guestCount: updatedBooking.guest_count,
            roomCount: updatedBooking.room_count,
            totalPrice: Number(updatedBooking.total_price),
            specialRequests: updatedBooking.special_requests,
          })

        } catch (providerError: any) {
          console.error('❌ Provider booking failed:', providerError)

          // CRITICAL: Payment succeeded but provider booking failed
          // We must refund the customer since we can't fulfill the booking
          try {
            if (session.payment_intent) {
              await stripe.refunds.create({
                payment_intent: session.payment_intent as string,
                reason: 'requested_by_customer',
                metadata: {
                  bookingId,
                  reason: 'Provider booking failed',
                  error: providerError.message
                }
              })
              console.log(`💸 Refund issued for failed provider booking ${bookingId}`)
            }

            // Update booking status to failed
            await supabase
              .from('bookings')
              .update({
                status: 'failed',
                booking_metadata: {
                  ...booking.booking_metadata,
                  providerError: providerError.message,
                  refundIssued: true,
                  failedAt: new Date().toISOString()
                },
                updated_at: new Date().toISOString(),
              })
              .eq('id', bookingId)

          } catch (refundError: any) {
            console.error('🚨 CRITICAL: Failed to refund after provider booking failure:', refundError)
            // This requires manual intervention
            console.error(`Manual action required for booking ${bookingId}`)
          }

          return NextResponse.json(
            { error: 'Provider booking failed, refund issued' },
            { status: 500 }
          )
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
