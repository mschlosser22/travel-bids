import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      bookingId,
      hotelName,
      checkInDate,
      checkOutDate,
      totalPrice,
      guestEmail,
    } = body

    // Validate required fields
    if (!bookingId || !hotelName || !totalPrice || !guestEmail) {
      return NextResponse.json(
        { error: 'Missing required payment information' },
        { status: 400 }
      )
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: hotelName,
              description: `Check-in: ${checkInDate} | Check-out: ${checkOutDate}`,
            },
            unit_amount: Math.round(totalPrice * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_email: guestEmail,
      metadata: {
        bookingId,
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/booking/${bookingId}?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/booking/${bookingId}?payment=cancelled`,
    })

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    })

  } catch (error: any) {
    console.error('Stripe session creation error:', error)

    return NextResponse.json(
      {
        error: 'Failed to create payment session',
        message: error.message || 'Internal server error',
      },
      { status: 500 }
    )
  }
}
