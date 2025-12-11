import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getCachedOffer } from '@/lib/offer-cache'
import { getProviderManager } from '@/lib/hotel-providers'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
})

const PRICE_TOLERANCE = 0.01 // Allow 1% price difference

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      bookingId,
      providerId,
      providerHotelId,
      providerRoomId,
      checkInDate,
      checkOutDate,
      adults,
      rooms,
      guestEmail,
      offerKey, // Cache key for price comparison
    } = body

    // Validate required fields
    if (!bookingId || !providerId || !providerHotelId || !providerRoomId || !checkInDate || !checkOutDate || !guestEmail) {
      return NextResponse.json(
        { error: 'Missing required payment information' },
        { status: 400 }
      )
    }

    // CRITICAL SECURITY: Fetch fresh price from provider API (server-side, authoritative)
    const providerManager = getProviderManager()
    const provider = providerManager.getProvider(providerId)

    if (!provider) {
      return NextResponse.json(
        { error: 'Invalid provider', code: 'INVALID_PROVIDER' },
        { status: 400 }
      )
    }

    const freshHotelDetails = await provider.getDetails(providerHotelId, {
      checkInDate,
      checkOutDate,
      adults: adults || 2,
      roomQuantity: rooms || 1,
      cityCode: '', // Not needed for direct hotel lookup
    })

    // Get cached offer for price and room type comparison
    let cachedPrice: number | null = null
    let cachedRoomType: string | undefined
    if (offerKey) {
      const cachedOffer = await getCachedOffer(offerKey)
      if (cachedOffer) {
        cachedPrice = cachedOffer.room.price
        cachedRoomType = cachedOffer.room.roomType
      }
    }

    // Find the room that matches the booking
    // Note: Amadeus generates ephemeral offer IDs, so we match by room type instead
    const freshRoom = freshHotelDetails.rooms.find(
      r => r.roomType === cachedRoomType || r.roomId === providerRoomId
    ) || freshHotelDetails.rooms[0] // Fallback to cheapest room if no exact match

    if (!freshRoom) {
      return NextResponse.json(
        { error: 'Room no longer available', code: 'ROOM_UNAVAILABLE' },
        { status: 400 }
      )
    }

    const freshPrice = freshRoom.price
    const hotelName = freshHotelDetails.name

    // Compare with cached price (if available)
    if (cachedPrice !== null) {
      // Check if price changed significantly
      const priceDifference = Math.abs(freshPrice - cachedPrice) / cachedPrice

      if (priceDifference > PRICE_TOLERANCE) {
        console.warn(`[Payment] Price changed: cached=${cachedPrice}, fresh=${freshPrice}, diff=${(priceDifference * 100).toFixed(2)}%`)

        return NextResponse.json(
          {
            error: 'Price has changed',
            code: 'PRICE_CHANGED',
            cachedPrice,
            currentPrice: freshPrice,
            message: `The room price has changed from $${cachedPrice.toFixed(2)} to $${freshPrice.toFixed(2)}. Please review and confirm.`
          },
          { status: 409 } // Conflict status
        )
      }
    }

    console.log(`[Payment] Creating checkout - Fresh price: $${freshPrice}, Cached price: $${cachedPrice || 'N/A'}`)

    // Create Stripe Checkout Session with SERVER-VALIDATED PRICE
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
            unit_amount: Math.round(freshPrice * 100), // Use FRESH price from API
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_email: guestEmail,
      metadata: {
        bookingId,
        providerId,
        providerHotelId,
        providerRoomId,
        validatedPrice: freshPrice.toString(),
        cachedPrice: cachedPrice?.toString() || 'none',
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/booking/${bookingId}?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/booking/${bookingId}?payment=cancelled`,
    })

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
      validatedPrice: freshPrice,
      priceMatched: cachedPrice ? Math.abs(freshPrice - cachedPrice) / cachedPrice <= PRICE_TOLERANCE : false,
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
