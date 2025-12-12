import { getCurrentUser } from '@/lib/auth-helpers'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getCancellationPolicy, calculateRefundAmount } from '@/lib/cancellation-policy'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CancelButton } from './cancel-button'
import { ConversionTracker } from './conversion-tracker'

// Service role client for unrestricted access (bypasses RLS)
const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

interface BookingDetailsProps {
  params: Promise<{
    id: string
  }>
}

async function getBooking(id: string, userId?: string, email?: string) {
  // Use service role to bypass RLS and fetch booking
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return null
  }

  // Check if user has access to this booking
  const hasAccess = userId && (data.user_id === userId || data.guest_email === email)

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
    const checkIn = new Date(booking.check_in_date)
    const checkOut = new Date(booking.check_out_date)

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="mb-6">
            <div className="inline-block bg-green-100 rounded-full p-3 mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
            <p className="text-gray-600">
              Your reservation has been confirmed. Check your email for full details.
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-2">Booking Reference</p>
            <p className="text-lg font-mono font-semibold text-gray-900">
              {booking.id.slice(0, 13)}
            </p>
          </div>

          <div className="text-left mb-6 space-y-3">
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span className="text-sm text-gray-600">Hotel</span>
              <span className="text-sm font-medium text-gray-900">{booking.hotel_name || 'Confirmed'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span className="text-sm text-gray-600">Check-in</span>
              <span className="text-sm font-medium text-gray-900">
                {checkIn.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span className="text-sm text-gray-600">Check-out</span>
              <span className="text-sm font-medium text-gray-900">
                {checkOut.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <p className="text-sm text-gray-600 mb-4">
              Sign in to view full details, modify, or cancel your booking.
            </p>
            <Link
              href={`/login?next=/booking/${booking.id}`}
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
    Number(booking.total_price),
    new Date(booking.check_in_date),
    new Date()
  )

  const checkIn = new Date(booking.check_in_date)
  const checkOut = new Date(booking.check_out_date)
  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))

  const isCancelled = !!booking.cancelled_at
  const isPendingCancellation = booking.status === 'pending_cancellation'
  const canCancel = !isCancelled && !isPendingCancellation && booking.status === 'confirmed' && refundInfo.canRefund

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Track conversion for confirmed bookings */}
      {booking.status === 'confirmed' && (
        <ConversionTracker
          bookingId={booking.id}
          totalAmount={parseFloat(booking.total_price)}
          currency={booking.currency || 'USD'}
        />
      )}

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
        {isPendingCancellation && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <p className="text-orange-800 font-semibold">Cancellation request pending</p>
            <p className="text-sm text-orange-700 mt-1">
              We're confirming with the hotel. You'll receive an email within 24 hours.
            </p>
            {booking.cancellation_reason && (
              <p className="text-sm text-orange-600 mt-2">{booking.cancellation_reason}</p>
            )}
          </div>
        )}

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
            <h1 className="text-2xl font-bold">{booking.hotel_name || booking.provider_hotel_id || 'Hotel Booking'}</h1>
            <p className="text-blue-100 mt-1">Booking ID: {booking.id.slice(0, 8)}</p>
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
                  <p className="font-medium text-gray-900">{booking.guest_count} guest{booking.guest_count !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Room Rate ({nights} night{nights !== 1 ? 's' : ''})</span>
                  <span className="font-medium text-gray-900">${Number(booking.total_price).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total Paid</span>
                  <span>${Number(booking.total_price).toFixed(2)}</span>
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
          <CancelButton
            bookingId={booking.id}
            estimatedRefund={refundInfo.refundAmount}
          />
        )}
      </main>
    </div>
  )
}
