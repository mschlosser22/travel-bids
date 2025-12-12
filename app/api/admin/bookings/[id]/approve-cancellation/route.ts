import { requireAdminAPI } from '@/lib/admin-helpers'
import { createClient } from '@/lib/supabase-server'
import { sendCancellationConfirmation } from '@/lib/email'
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

/**
 * Admin endpoint to approve a pending cancellation and process refund
 * Called after manually confirming cancellation with the hotel/provider
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    // Require admin authentication
    const { user, role } = await requireAdminAPI()
    const { id } = await context.params

    // Parse request body for admin notes
    const body = await request.json().catch(() => ({}))
    const adminNotes = body.notes || ''

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

    // Check if booking is pending cancellation
    if (booking.status !== 'pending_cancellation') {
      return NextResponse.json(
        { error: 'Booking is not pending cancellation' },
        { status: 400 }
      )
    }

    // Log admin approval attempt
    await logCancellationActivity({
      bookingId: id,
      activityType: 'admin_approved',
      actorEmail: user.email!,
      actorRole: 'admin',
      userId: user.id,
      details: {
        role: role,
        bookingStatus: booking.status,
      },
      notes: adminNotes,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    })

    // Calculate refund amount from cancellation_reason if stored, or recalculate
    // For now, we'll recalculate based on the original policy
    const { getCancellationPolicy, calculateRefundAmount } = await import('@/lib/cancellation-policy')
    const policy = getCancellationPolicy(
      booking.cancellation_policy_override,
      booking.cancellation_policy
    )
    const refundInfo = calculateRefundAmount(
      policy,
      booking.total_amount,
      new Date(booking.check_in_date),
      new Date(booking.cancelled_at || new Date())
    )

    // Process Stripe refund
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
            approvedBy: user.email,
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
            approvedBy: user.email,
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
        cancelled_at: booking.cancelled_at || new Date().toISOString(),
        cancellation_reason: 'Requested by customer - Approved by admin',
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
          approvedBy: user.email,
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
          approvedBy: user.email,
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Cancellation approved and refund processed',
      refundAmount: refundInfo.refundAmount,
      refundId,
    })
  } catch (error: any) {
    console.error('Approval error:', error)

    // Handle auth errors
    if (error.statusCode === 401) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (error.statusCode === 403) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
