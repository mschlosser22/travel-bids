import { getCurrentUser } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase-server'
import { getCancellationPolicy, calculateRefundAmount } from '@/lib/cancellation-policy'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface BookingDetailsProps {
  params: Promise<{
    id: string
  }>
}

async function getBooking(id: string, userId?: string, email?: string) {
  const supabase = await createClient()

  let query = supabase.from('bookings').select('*').eq('id', id).single()

  const { data, error } = await query

  if (error || !data) {
    return null
  }

  // Check if user has access to this booking
  const hasAccess = !userId || data.user_id === userId || data.guest_email === email

  return { booking: data, hasAccess }
}

export default async function BookingDetailsPage({ params }: BookingDetailsProps) {
  const { id } = await params
  const user = await getCurrentUser()

  const result = await getBooking(id, user?.id, user?.email)

  if (!result) {
    notFound()
  }

  const { booking, hasAccess } = result

  // Show limited info if not authenticated
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Booking Confirmed</h1>
          <p className="text-gray-600 mb-6">
            Your booking has been confirmed. Check your email for details.
          </p>
          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-2">Confirmation Number</p>
            <p className="text-lg font-mono font-semibold text-gray-900">
              {booking.confirmation_number}
            </p>
          </div>
          <div className="border-t border-gray-200 pt-6">
            <p className="text-sm text-gray-600 mb-4">
              Want to view, modify, or cancel this booking?
            </p>
            <Link
              href="/login"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Sign in to your account
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Calculate cancellation policy
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

  const checkIn = new Date(booking.check_in_date)
  const checkOut = new Date(booking.check_out_date)
  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))

  const isCancelled = !!booking.cancelled_at
  const canCancel = !isCancelled && booking.status === 'confirmed' && refundInfo.canRefund

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 font-medium">
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Banner */}
        {isCancelled && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 font-semibold">This booking has been cancelled</p>
            <p className="text-sm text-red-600 mt-1">
              Cancelled on {new Date(booking.cancelled_at).toLocaleDateString()}
            </p>
            {booking.cancellation_reason && (
              <p className="text-sm text-red-600 mt-1">Reason: {booking.cancellation_reason}</p>
            )}
            {booking.refund_amount && (
              <p className="text-sm text-red-600 mt-1">
                Refund: ${booking.refund_amount} ({booking.refund_status})
              </p>
            )}
          </div>
        )}

        {/* Booking Details */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
          <div className="bg-blue-600 text-white px-6 py-4">
            <h1 className="text-2xl font-bold">{booking.hotel_name}</h1>
            <p className="text-blue-100 mt-1">Confirmation: {booking.confirmation_number}</p>
          </div>

          <div className="p-6 space-y-6">
            {/* Dates */}
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Check-in</p>
                <p className="text-lg font-semibold text-gray-900">
                  {checkIn.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
                <p className="text-sm text-gray-600">After 3:00 PM</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Check-out</p>
                <p className="text-lg font-semibold text-gray-900">
                  {checkOut.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
                <p className="text-sm text-gray-600">Before 11:00 AM</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Duration</p>
                <p className="text-lg font-semibold text-gray-900">
                  {nights} night{nights !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Guest Information */}
            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Guest Information</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-medium text-gray-900">{booking.guest_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium text-gray-900">{booking.guest_email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-medium text-gray-900">{booking.guest_phone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Number of Guests</p>
                  <p className="font-medium text-gray-900">{booking.num_guests} guest{booking.num_guests !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Room Rate ({nights} night{nights !== 1 ? 's' : ''})</span>
                  <span className="font-medium text-gray-900">${booking.total_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total Paid</span>
                  <span>${booking.total_amount.toFixed(2)}</span>
                </div>
                <p className="text-sm text-gray-600">Payment ID: {booking.stripe_payment_intent_id}</p>
              </div>
            </div>

            {/* Cancellation Policy */}
            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Cancellation Policy</h2>
              <p className="text-sm text-gray-600 mb-4">{policy.description}</p>

              {!isCancelled && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-900 mb-2">
                    {refundInfo.canRefund ? '✓ You can cancel this booking' : '✗ Cancellation not available'}
                  </p>
                  {refundInfo.canRefund && (
                    <p className="text-sm text-gray-600">
                      Estimated refund: ${refundInfo.refundAmount.toFixed(2)} ({policy.refundPercentage}%)
                    </p>
                  )}
                  {!refundInfo.canRefund && refundInfo.reason && (
                    <p className="text-sm text-gray-600">{refundInfo.reason}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        {canCancel && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Need to cancel?</h2>
            <p className="text-sm text-gray-600 mb-4">
              You can request a cancellation for this booking. Our team will process your request and issue a refund according to the cancellation policy.
            </p>
            <form action={`/api/bookings/${booking.id}/cancel`} method="POST">
              <button
                type="submit"
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Request Cancellation
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  )
}
