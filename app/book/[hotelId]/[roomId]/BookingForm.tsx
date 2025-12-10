'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { HotelDetails } from '@/lib/hotel-providers/types'
import { formatDateDisplay, calculateNights, buildConfirmationUrl } from '@/lib/url-helpers'
import { posthog } from '@/lib/posthog'

interface BookingFormProps {
  hotelId: string
  roomId: string
  providerId: string
  checkInDate: string
  checkOutDate: string
  adults: number
  rooms: number
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
}: BookingFormProps) {
  const router = useRouter()
  const [hotelDetails, setHotelDetails] = useState<HotelDetails | null>(null)
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

  // Fetch hotel details to display booking summary
  useEffect(() => {
    async function fetchDetails() {
      try {
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
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchDetails()
  }, [hotelId, providerId, checkInDate, checkOutDate, adults, rooms])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      // For MVP, we're not processing payments yet
      // Just create a booking record in the database
      const selectedRoom = hotelDetails?.rooms.find(r => r.roomId === roomId)

      const response = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelId,
          roomId,
          providerId,
          checkInDate,
          checkOutDate,
          adults,
          rooms,
          guestDetails,
          totalPrice: selectedRoom?.price || 0,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create booking')
      }

      const data = await response.json()

      // Track booking completion
      const bookedRoom = hotelDetails?.rooms.find(r => r.roomId === roomId)
      posthog.capture('booking_completed', {
        booking_id: data.bookingId,
        hotel_id: hotelId,
        hotel_name: hotelDetails?.name,
        provider: providerId,
        room_id: roomId,
        room_type: bookedRoom?.roomType,
        price: bookedRoom?.price,
        check_in: checkInDate,
        check_out: checkOutDate,
        nights: calculateNights(checkInDate, checkOutDate),
        adults,
        rooms,
        guest_email: guestDetails.email
      })

      // Navigate to confirmation page
      router.push(buildConfirmationUrl(data.bookingId))
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

  const selectedRoom = hotelDetails?.rooms.find(r => r.roomId === roomId)
  const nights = calculateNights(checkInDate, checkOutDate)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Booking</h1>
        <p className="text-gray-600 mb-8">Please fill in your details to confirm your reservation</p>

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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-1">Payment at Hotel</h3>
                    <p className="text-sm text-blue-800">
                      No payment required now. You'll pay directly at the hotel during check-in.
                      This reservation is confirmed once you submit your details.
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
                {submitting ? 'Processing...' : 'Confirm Booking'}
              </button>
            </form>
          </div>

          {/* Booking Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Booking Summary</h2>

              {hotelDetails && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{hotelDetails.name}</h3>
                    <p className="text-sm text-gray-600">{hotelDetails.address}</p>
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

                  {selectedRoom && (
                    <div className="pt-4 border-t border-gray-200">
                      <div className="text-sm mb-2 text-gray-600">Room Type</div>
                      <div className="font-medium text-gray-900">{selectedRoom.roomType}</div>
                      {selectedRoom.bedType && (
                        <div className="text-sm text-gray-600 mt-1">{selectedRoom.bedType}</div>
                      )}
                    </div>
                  )}

                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-baseline">
                      <span className="text-lg font-semibold text-gray-900">Total</span>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          ${selectedRoom?.price.toFixed(2) || '0.00'}
                        </div>
                        <div className="text-sm text-gray-600">
                          ${((selectedRoom?.price || 0) / nights).toFixed(2)}/night
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
