import { ConfirmationActions } from './ConfirmationActions'

import { formatDateDisplay } from '@/lib/url-helpers'

export default async function BookingConfirmationPage({
  params,
}: {
  params: Promise<{ bookingId: string }>
}) {
  const { bookingId } = await params

  // Fetch booking details from database
  let booking = null
  let error = null

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}/api/bookings/${bookingId}`, {
      cache: 'no-store', // Always fetch fresh data
    })

    if (response.ok) {
      const data = await response.json()
      booking = data.booking
    } else {
      error = 'Booking not found'
    }
  } catch (err) {
    console.error('Error fetching booking:', err)
    error = 'Failed to load booking details'
  }

  // Show error if booking not found
  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-4 py-4">
            <a href="/" className="text-2xl font-bold text-blue-600">
              Travel Bids
            </a>
          </div>
        </header>
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
              <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Not Found</h1>
              <p className="text-gray-600 mb-6">{error}</p>
              <a href="/" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors">
                Back to Home
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <a href="/" className="text-2xl font-bold text-blue-600">
            Travel Bids
          </a>
        </div>
      </header>

      {/* Confirmation Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Success Icon */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
              <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Booking Confirmed!
            </h1>
            <p className="text-xl text-gray-600">
              Your reservation has been successfully created
            </p>
          </div>

          {/* Booking Details */}
          <div className="bg-white rounded-lg shadow-md p-8 mb-6">
            <div className="border-b border-gray-200 pb-6 mb-6">
              <h2 className="text-sm font-medium text-gray-500 mb-2">Booking Reference</h2>
              <p className="text-2xl font-bold text-gray-900 font-mono">{booking.id}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                  booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                  booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {booking.status.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Guest Information */}
            <div className="border-b border-gray-200 pb-6 mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Guest Information</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Name:</span>{' '}
                  <span className="font-medium text-gray-900">{booking.guestName}</span>
                </div>
                <div>
                  <span className="text-gray-600">Email:</span>{' '}
                  <span className="font-medium text-gray-900">{booking.guestEmail}</span>
                </div>
                <div>
                  <span className="text-gray-600">Phone:</span>{' '}
                  <span className="font-medium text-gray-900">{booking.guestPhone}</span>
                </div>
              </div>
            </div>

            {/* Stay Information */}
            <div className="border-b border-gray-200 pb-6 mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Stay Information</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Check-in:</span>{' '}
                  <span className="font-medium text-gray-900">{formatDateDisplay(booking.checkInDate)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Check-out:</span>{' '}
                  <span className="font-medium text-gray-900">{formatDateDisplay(booking.checkOutDate)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Guests:</span>{' '}
                  <span className="font-medium text-gray-900">{booking.guestCount}</span>
                </div>
                <div>
                  <span className="text-gray-600">Rooms:</span>{' '}
                  <span className="font-medium text-gray-900">{booking.roomCount}</span>
                </div>
              </div>
            </div>

            {/* Price Information */}
            <div className="pb-6 mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Price Information</h3>
              <div className="flex justify-between items-baseline">
                <span className="text-gray-600">Total Price:</span>
                <span className="text-2xl font-bold text-gray-900">${Number(booking.totalPrice).toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Confirmation Email Sent</h3>
                  <p className="text-sm text-gray-600">
                    We've sent a confirmation email with all your booking details.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">What's Next?</h3>
                  <p className="text-sm text-gray-600">
                    Present this booking reference at check-in. Payment will be collected at the hotel.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Free Cancellation</h3>
                  <p className="text-sm text-gray-600">
                    Cancel or modify your booking anytime before check-in at no charge.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <ConfirmationActions />

          {/* Help Text */}
          <div className="mt-8 text-center text-sm text-gray-600">
            <p>Need help? Contact us at <a href="mailto:support@travelbids.com" className="text-blue-600 hover:text-blue-700">support@travelbids.com</a></p>
          </div>
        </div>
      </div>
    </div>
  )
}
