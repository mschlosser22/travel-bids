'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { HotelDetails } from '@/lib/hotel-providers/types'
import { formatDateDisplay, calculateNights, buildConfirmationUrl } from '@/lib/url-helpers'
import { posthog } from '@/lib/posthog'
import type { CachedOffer } from '@/lib/offer-cache'

interface BookingFormProps {
  hotelId: string
  roomId: string
  providerId: string
  checkInDate: string
  checkOutDate: string
  adults: number
  rooms: number
  preferredRoomType?: string
  offerKey?: string
}

interface GuestDetails {
  firstName: string
  lastName: string
  email: string
  phone: string
  specialRequests: string
}

export function BookingForm({
  hotelId,
  roomId,
  providerId,
  checkInDate,
  checkOutDate,
  adults,
  rooms,
  preferredRoomType,
  offerKey,
}: BookingFormProps) {
  const router = useRouter()
  const [hotelDetails, setHotelDetails] = useState<HotelDetails | null>(null)
  const [cachedOffer, setCachedOffer] = useState<CachedOffer | null>(null)
  const [usedCache, setUsedCache] = useState(false)
  const [priceChanged, setPriceChanged] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [guestDetails, setGuestDetails] = useState<GuestDetails>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    specialRequests: '',
  })

  // Fetch hotel details or use cached offer
  useEffect(() => {
    async function fetchDetails() {
      try {
        // FIRST: Try to use cached offer if offerKey provided
        if (offerKey) {
          console.log('[BookingForm] Attempting to retrieve cached offer:', offerKey)

          try {
            const cacheResponse = await fetch(`/api/cache/offer?key=${encodeURIComponent(offerKey)}`)

            if (cacheResponse.ok) {
              const { offer } = await cacheResponse.json()
              console.log('[BookingForm] Cache HIT - using cached offer')
              setCachedOffer(offer)
              setUsedCache(true)
              setLoading(false)

              // Track cache hit
              posthog.capture('offer_cache_hit', {
                cache_key: offerKey,
                provider: providerId,
                hotel_id: hotelId,
                price: offer.room.price
              })

              return // Skip API call, use cached data
            }
          } catch (error) {
            console.error('[BookingForm] Error retrieving cached offer:', error)
          }

          // Cache miss - log and fall through to API call
          console.warn('[BookingForm] Cache MISS - fetching fresh data from API')
          posthog.capture('offer_cache_miss', {
            cache_key: offerKey,
            provider: providerId,
            hotel_id: hotelId,
            reason: 'not_found_or_expired'
          })
        }

        // FALLBACK: Fetch fresh data from API
        console.log('[BookingForm] Fetching fresh hotel details from API')
        const response = await fetch('/api/hotels/details', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            providerHotelId: hotelId,
            providerId,
            checkInDate,
            checkOutDate,
            adults,
            roomQuantity: rooms,
            currency: 'USD',
          }),
        })

        if (!response.ok) throw new Error('Failed to load hotel details')

        const data = await response.json()
        setHotelDetails(data.hotel)

        // Check if price changed from cached offer (if we had one but it expired)
        if (cachedOffer) {
          const freshRoom = data.hotel.rooms.find((r: any) => r.roomType === cachedOffer.room.roomType)
          if (freshRoom && freshRoom.price !== cachedOffer.room.price) {
            console.warn('[BookingForm] Price changed from cached offer:', cachedOffer.room.price, '→', freshRoom.price)
            setPriceChanged(true)

            // Track price change
            posthog.capture('offer_price_changed', {
              cache_key: offerKey,
              old_price: cachedOffer.room.price,
              new_price: freshRoom.price,
              difference: freshRoom.price - cachedOffer.room.price
            })
          }
        }
      } catch (err: any) {
        console.error('[BookingForm] Error fetching details:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchDetails()
  }, [hotelId, providerId, checkInDate, checkOutDate, adults, rooms, offerKey])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      // Determine which room data to use
      // Priority: 1. Cached offer, 2. Fresh API data by roomId, 3. Fresh API by roomType, 4. First room
      let roomToBook

      if (usedCache && cachedOffer) {
        // Use cached offer data (already validated and price-locked)
        console.log('[BookingForm] Using cached offer for booking:', cachedOffer.room.price)
        roomToBook = cachedOffer.room
      } else {
        // Fallback to fresh API data with matching logic
        roomToBook =
          hotelDetails?.rooms.find(r => r.roomId === roomId) ||
          (preferredRoomType ? hotelDetails?.rooms.find(r => r.roomType === preferredRoomType) : null) ||
          hotelDetails?.rooms[0]
      }

      if (!roomToBook) {
        throw new Error('No rooms available')
      }

      console.log('[BookingForm] Room to book:', roomToBook.roomType, 'Price:', roomToBook.price)

      // Step 1: Create booking in database with 'pending' status
      const bookingResponse = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelId,
          roomId: roomToBook.roomId, // Use roomId from cached offer or fresh API
          providerId,
          checkInDate,
          checkOutDate,
          adults,
          rooms,
          guestDetails,
          totalPrice: roomToBook.price, // Use price from cached offer or fresh API (server-authoritative)
        }),
      })

      if (!bookingResponse.ok) {
        throw new Error('Failed to create booking')
      }

      const bookingData = await bookingResponse.json()

      // Track booking initiated
      const hotelName = usedCache && cachedOffer ? cachedOffer.hotelName : hotelDetails?.name

      posthog.capture('booking_initiated', {
        booking_id: bookingData.bookingId,
        hotel_id: hotelId,
        hotel_name: hotelName,
        provider: providerId,
        room_id: roomToBook.roomId,
        room_type: roomToBook.roomType,
        price: roomToBook.price,
        check_in: checkInDate,
        check_out: checkOutDate,
        nights: calculateNights(checkInDate, checkOutDate),
        adults,
        rooms,
        guest_email: guestDetails.email,
        used_cache: usedCache,
        cache_key: offerKey
      })

      // Step 2: Create Stripe Checkout Session with server-side price validation
      const checkoutResponse = await fetch('/api/payments/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: bookingData.bookingId,
          providerId,
          providerHotelId: hotelId,
          providerRoomId: roomToBook.roomId,
          checkInDate,
          checkOutDate,
          adults,
          rooms,
          guestEmail: guestDetails.email,
          offerKey, // Send cache key for price comparison
        }),
      })

      if (!checkoutResponse.ok) {
        const errorData = await checkoutResponse.json()

        // Handle price change error specifically
        if (errorData.code === 'PRICE_CHANGED') {
          setError(
            `Price Updated: The room price has changed from $${errorData.cachedPrice.toFixed(2)} to $${errorData.currentPrice.toFixed(2)}. Please refresh and try again.`
          )
          setSubmitting(false)
          return
        }

        if (errorData.code === 'ROOM_UNAVAILABLE') {
          setError('Sorry, this room is no longer available. Please select another room.')
          setSubmitting(false)
          return
        }

        throw new Error(errorData.message || 'Failed to create payment session')
      }

      const checkoutData = await checkoutResponse.json()

      console.log('[BookingForm] Price validation:', {
        validated: checkoutData.validatedPrice,
        matched: checkoutData.priceMatched,
        cached: roomToBook.price
      })

      // Step 3: Redirect to Stripe Checkout
      if (checkoutData.url) {
        window.location.href = checkoutData.url
      } else {
        throw new Error('No checkout URL received')
      }

    } catch (err: any) {
      setError(err.message || 'Failed to complete booking')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading booking details...</p>
        </div>
      </div>
    )
  }

  if (error && !hotelDetails) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center max-w-2xl mx-auto">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Booking</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <a href="/" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors">
            Back to Home
          </a>
        </div>
      </div>
    )
  }

  // Determine which data to display (cached offer or fresh API data)
  const displayRoom = usedCache && cachedOffer
    ? cachedOffer.room
    : (hotelDetails?.rooms.find(r => r.roomId === roomId) ||
       (preferredRoomType ? hotelDetails?.rooms.find(r => r.roomType === preferredRoomType) : null) ||
       hotelDetails?.rooms[0])

  const displayHotelName = usedCache && cachedOffer ? cachedOffer.hotelName : hotelDetails?.name
  const displayHotelAddress = usedCache && cachedOffer ? cachedOffer.hotelAddress : hotelDetails?.address

  const nights = calculateNights(checkInDate, checkOutDate)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Booking</h1>
        <p className="text-gray-600 mb-8">Please fill in your details to confirm your reservation</p>

        {/* Price Change Warning */}
        {priceChanged && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="font-semibold text-yellow-900 mb-1">Price Updated</h3>
                <p className="text-sm text-yellow-800">
                  The room price has been updated since you selected it. The new price is shown below.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Guest Details Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Contact Information */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Guest Information</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      required
                      value={guestDetails.firstName}
                      onChange={(e) => setGuestDetails({ ...guestDetails, firstName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      required
                      value={guestDetails.lastName}
                      onChange={(e) => setGuestDetails({ ...guestDetails, lastName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={guestDetails.email}
                    onChange={(e) => setGuestDetails({ ...guestDetails, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="mt-4">
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    required
                    value={guestDetails.phone}
                    onChange={(e) => setGuestDetails({ ...guestDetails, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="mt-4">
                  <label htmlFor="specialRequests" className="block text-sm font-medium text-gray-700 mb-2">
                    Special Requests (Optional)
                  </label>
                  <textarea
                    id="specialRequests"
                    rows={3}
                    value={guestDetails.specialRequests}
                    onChange={(e) => setGuestDetails({ ...guestDetails, specialRequests: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="E.g., early check-in, high floor, etc."
                  />
                </div>
              </div>

              {/* Payment Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-1">Secure Payment</h3>
                    <p className="text-sm text-blue-800">
                      You'll be redirected to our secure payment processor (Stripe) to complete your booking.
                      Your payment information is encrypted and secure.
                    </p>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-4 px-6 rounded-lg transition-colors text-lg"
              >
                {submitting ? 'Redirecting to payment...' : 'Continue to Payment'}
              </button>
            </form>
          </div>

          {/* Booking Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Booking Summary</h2>

              {(hotelDetails || cachedOffer) && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{displayHotelName}</h3>
                    <p className="text-sm text-gray-600">{displayHotelAddress}</p>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Check-in</span>
                        <span className="font-medium text-gray-900">{formatDateDisplay(checkInDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Check-out</span>
                        <span className="font-medium text-gray-900">{formatDateDisplay(checkOutDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Nights</span>
                        <span className="font-medium text-gray-900">{nights}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Guests</span>
                        <span className="font-medium text-gray-900">{adults}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Rooms</span>
                        <span className="font-medium text-gray-900">{rooms}</span>
                      </div>
                    </div>
                  </div>

                  {displayRoom && (
                    <div className="pt-4 border-t border-gray-200">
                      <div className="text-sm mb-2 text-gray-600">Room Type</div>
                      <div className="font-medium text-gray-900">{displayRoom.roomType}</div>
                      {displayRoom.bedType && (
                        <div className="text-sm text-gray-600 mt-1">{displayRoom.bedType}</div>
                      )}
                    </div>
                  )}

                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-baseline">
                      <span className="text-lg font-semibold text-gray-900">Total</span>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          ${displayRoom?.price.toFixed(2) || '0.00'}
                        </div>
                        <div className="text-sm text-gray-600">
                          ${((displayRoom?.price || 0) / nights).toFixed(2)}/night
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-2 text-sm text-green-700">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Free cancellation</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
