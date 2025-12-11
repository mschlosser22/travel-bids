import { requireAuth } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase-server'
import { getCancellationPolicy, calculateRefundAmount } from '@/lib/cancellation-policy'
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
    const user = await requireAuth()
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
      } catch (stripeError: any) {
        console.error('Stripe refund error:', stripeError)
        return NextResponse.json(
          { error: 'Failed to process refund: ' + stripeError.message },
          { status: 500 }
        )
      }
    }

    // Update booking as cancelled
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        cancelled_at: new Date().toISOString(),
        cancellation_reason: 'Requested by customer',
        refund_amount: refundInfo.refundAmount,
        refund_stripe_id: refundId,
        refund_status: refundAmountCents > 0 ? 'completed' : 'not_applicable',
        status: 'cancelled',
      })
      .eq('id', id)

    if (updateError) {
      console.error('Error updating booking:', updateError)
      return NextResponse.json(
        { error: 'Failed to update booking status' },
        { status: 500 }
      )
    }

    // TODO: Send cancellation confirmation email

    return NextResponse.redirect(
      new URL(`/booking/${id}?cancelled=true`, request.url)
    )
  } catch (error) {
    console.error('Cancellation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
