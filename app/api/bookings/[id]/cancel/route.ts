import { requireAuthAPI } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase-server'
import { getCancellationPolicy, calculateRefundAmount } from '@/lib/cancellation-policy'
import { getProviderManager } from '@/lib/hotel-providers/provider-manager'
import { sendCancellationConfirmation, sendPendingCancellationEmail } from '@/lib/email'
import { logCancellationActivity } from '@/lib/cancellation-activity-logger'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
})

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    // Require authentication
    const user = await requireAuthAPI()
    const { id } = await context.params

    // Get booking
    const supabase = await createClient()
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Verify user owns this booking
    if (booking.user_id !== user.id && booking.guest_email !== user.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Check if already cancelled
    if (booking.cancelled_at) {
      return NextResponse.json(
        { error: 'Booking already cancelled' },
        { status: 400 }
      )
    }

    // Check if booking is confirmed
    if (booking.status !== 'confirmed') {
      return NextResponse.json(
        { error: 'Only confirmed bookings can be cancelled' },
        { status: 400 }
      )
    }

    // Calculate refund based on cancellation policy
    const policy = getCancellationPolicy(
      booking.cancellation_policy_override,
      booking.cancellation_policy
    )
    const refundInfo = calculateRefundAmount(
      policy,
      booking.total_amount,
      new Date(booking.check_in_date),
      new Date()
    )

    if (!refundInfo.canRefund) {
      return NextResponse.json(
        { error: refundInfo.reason || 'Cancellation not allowed' },
        { status: 400 }
      )
    }

    // Log cancellation request
    await logCancellationActivity({
      bookingId: id,
      activityType: 'requested',
      actorEmail: user.email!,
      actorRole: 'customer',
      userId: user.id,
      details: {
        refundEligible: refundInfo.canRefund,
        estimatedRefund: refundInfo.refundAmount,
        refundPercentage: refundInfo.refundPercentage,
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    })

    // Attempt provider cancellation
    let providerCancellationSuccessful = false
    let providerCancellationMessage = ''

    try {
      const providerManager = getProviderManager()
      const provider = providerManager.getProvider(booking.provider_name)

      if (provider && booking.provider_booking_id) {
        // Log attempt
        await logCancellationActivity({
          bookingId: id,
          activityType: 'provider_attempted',
          actorEmail: 'system@travelbids.com',
          actorRole: 'system',
          details: {
            provider: booking.provider_name,
            providerBookingId: booking.provider_booking_id,
          },
        })

        const cancellationResult = await provider.cancelBooking(booking.provider_booking_id)

        if (!cancellationResult.success) {
          providerCancellationMessage = cancellationResult.message || 'Provider cancellation not available'
          console.warn(`Provider cancellation failed for ${booking.provider_name}:`, providerCancellationMessage)

          // Log failure
          await logCancellationActivity({
            bookingId: id,
            activityType: 'provider_failed',
            actorEmail: 'system@travelbids.com',
            actorRole: 'system',
            details: {
              provider: booking.provider_name,
              reason: providerCancellationMessage,
              response: cancellationResult,
            },
          })
        } else {
          providerCancellationSuccessful = true
          console.log(`Provider cancellation successful for ${booking.provider_name}`)

          // Log success
          await logCancellationActivity({
            bookingId: id,
            activityType: 'provider_succeeded',
            actorEmail: 'system@travelbids.com',
            actorRole: 'system',
            details: {
              provider: booking.provider_name,
              response: cancellationResult,
            },
          })
        }
      }
    } catch (providerError: any) {
      console.error('Provider cancellation error:', providerError)
      providerCancellationMessage = 'Provider cancellation error'

      // Log error
      await logCancellationActivity({
        bookingId: id,
        activityType: 'provider_failed',
        actorEmail: 'system@travelbids.com',
        actorRole: 'system',
        details: {
          provider: booking.provider_name,
          error: providerError.message || String(providerError),
        },
      })
    }

    // If provider cancellation failed, mark as pending and don't refund yet
    if (!providerCancellationSuccessful) {
      // Update booking to pending_cancellation status
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          status: 'pending_cancellation',
          cancellation_reason: `Requested by customer - Awaiting provider confirmation: ${providerCancellationMessage}`,
          requires_manual_processing: true,
        })
        .eq('id', id)

      if (updateError) {
        console.error('Error updating booking:', updateError)
        return NextResponse.json(
          { error: 'Failed to update booking status' },
          { status: 500 }
        )
      }

      // Log pending state
      await logCancellationActivity({
        bookingId: id,
        activityType: 'set_pending',
        actorEmail: 'system@travelbids.com',
        actorRole: 'system',
        details: {
          reason: providerCancellationMessage,
          estimatedRefund: refundInfo.refundAmount,
        },
        notes: 'Awaiting manual confirmation with hotel/provider',
      })

      // Send pending cancellation email
      try {
        await sendPendingCancellationEmail({
          bookingId: id,
          guestEmail: booking.guest_email,
          guestName: booking.guest_name,
          hotelName: booking.hotel_name || booking.provider_hotel_id,
          checkInDate: booking.check_in_date,
          checkOutDate: booking.check_out_date,
          estimatedRefundAmount: refundInfo.refundAmount,
        })

        await logCancellationActivity({
          bookingId: id,
          activityType: 'email_sent',
          actorEmail: 'system@travelbids.com',
          actorRole: 'system',
          details: {
            emailType: 'pending_cancellation',
            recipient: booking.guest_email,
          },
        })
      } catch (emailError: any) {
        console.error('Failed to send pending cancellation email:', emailError)
        await logCancellationActivity({
          bookingId: id,
          activityType: 'email_failed',
          actorEmail: 'system@travelbids.com',
          actorRole: 'system',
          details: {
            emailType: 'pending_cancellation',
            recipient: booking.guest_email,
            error: emailError.message,
          },
        })
      }

      return NextResponse.json({
        success: true,
        status: 'pending',
        message: 'Cancellation request received. We need to confirm with the hotel before processing your refund. You will receive an email within 24 hours.',
        estimatedRefundAmount: refundInfo.refundAmount,
      })
    }

    // Provider cancellation successful - proceed with refund
    const refundAmountCents = Math.round(refundInfo.refundAmount * 100)
    let refundId = null

    if (refundAmountCents > 0) {
      try {
        const refund = await stripe.refunds.create({
          payment_intent: booking.stripe_payment_intent_id,
          amount: refundAmountCents,
          reason: 'requested_by_customer',
        })
        refundId = refund.id

        // Log successful refund
        await logCancellationActivity({
          bookingId: id,
          activityType: 'refund_processed',
          actorEmail: 'system@travelbids.com',
          actorRole: 'system',
          details: {
            refundId: refund.id,
            refundAmount: refundInfo.refundAmount,
            refundPercentage: refundInfo.refundPercentage,
            stripePaymentIntent: booking.stripe_payment_intent_id,
          },
        })
      } catch (stripeError: any) {
        console.error('Stripe refund error:', stripeError)

        // Log refund failure
        await logCancellationActivity({
          bookingId: id,
          activityType: 'refund_failed',
          actorEmail: 'system@travelbids.com',
          actorRole: 'system',
          details: {
            error: stripeError.message,
            refundAmount: refundInfo.refundAmount,
            stripePaymentIntent: booking.stripe_payment_intent_id,
          },
        })

        return NextResponse.json(
          { error: 'Failed to process refund: ' + stripeError.message },
          { status: 500 }
        )
      }
    }

    // Update booking as cancelled with refund
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        cancelled_at: new Date().toISOString(),
        cancellation_reason: 'Requested by customer',
        refund_amount: refundInfo.refundAmount,
        refund_stripe_id: refundId,
        refund_status: refundAmountCents > 0 ? 'completed' : 'not_applicable',
        status: 'cancelled',
        requires_manual_processing: false,
      })
      .eq('id', id)

    if (updateError) {
      console.error('Error updating booking:', updateError)
      return NextResponse.json(
        { error: 'Failed to update booking status' },
        { status: 500 }
      )
    }

    // Send cancellation confirmation email
    try {
      await sendCancellationConfirmation({
        bookingId: id,
        guestEmail: booking.guest_email,
        guestName: booking.guest_name,
        hotelName: booking.hotel_name || booking.provider_hotel_id,
        checkInDate: booking.check_in_date,
        checkOutDate: booking.check_out_date,
        refundAmount: refundInfo.refundAmount,
        refundPercentage: refundInfo.refundPercentage,
        requiresManualProcessing: false,
      })

      await logCancellationActivity({
        bookingId: id,
        activityType: 'email_sent',
        actorEmail: 'system@travelbids.com',
        actorRole: 'system',
        details: {
          emailType: 'cancellation_confirmation',
          recipient: booking.guest_email,
        },
      })
    } catch (emailError: any) {
      console.error('Failed to send cancellation confirmation email:', emailError)
      await logCancellationActivity({
        bookingId: id,
        activityType: 'email_failed',
        actorEmail: 'system@travelbids.com',
        actorRole: 'system',
        details: {
          emailType: 'cancellation_confirmation',
          recipient: booking.guest_email,
          error: emailError.message,
        },
      })
    }

    return NextResponse.json({
      success: true,
      status: 'cancelled',
      message: 'Booking cancelled successfully',
      refundAmount: refundInfo.refundAmount,
      refundPercentage: refundInfo.refundPercentage,
    })
  } catch (error: any) {
    console.error('Cancellation error:', error)

    // Handle auth errors
    if (error.statusCode === 401) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
