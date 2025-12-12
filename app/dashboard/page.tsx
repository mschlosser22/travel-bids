import { requireAuth } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'

interface Booking {
  id: string
  provider_name: string
  provider_hotel_id: string
  hotel_name: string | null
  check_in_date: string
  check_out_date: string
  total_price: number
  status: string
  cancelled_at: string | null
  cancellation_reason: string | null
  refund_amount: number | null
  guest_name: string
  guest_email: string
  created_at: string
}

async function getBookings(userId: string, email: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .or(`user_id.eq.${userId},guest_email.eq.${email}`)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching bookings:', error)
    return []
  }

  return data as Booking[]
}

export default async function DashboardPage() {
  const user = await requireAuth()
  const bookings = await getBookings(user.id, user.email!)

  // Group bookings by status
  const upcomingBookings = bookings.filter(b =>
    b.status === 'confirmed' && !b.cancelled_at && new Date(b.check_in_date) > new Date()
  )
  const pastBookings = bookings.filter(b =>
    b.status === 'confirmed' && !b.cancelled_at && new Date(b.check_in_date) <= new Date()
  )
  const cancelledBookings = bookings.filter(b => b.cancelled_at || b.status === 'cancelled')
  const pendingCancellationBookings = bookings.filter(b => b.status === 'pending_cancellation')
  const pendingBookings = bookings.filter(b => b.status === 'pending')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Bookings</h1>

        {bookings.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600 mb-4">You don't have any bookings yet.</p>
            <Link
              href="/"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              Browse Hotels
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Upcoming Bookings */}
            {upcomingBookings.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Upcoming ({upcomingBookings.length})
                </h2>
                <div className="grid gap-4">
                  {upcomingBookings.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))}
                </div>
              </section>
            )}

            {/* Pending Cancellation Bookings */}
            {pendingCancellationBookings.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Pending Cancellation ({pendingCancellationBookings.length})
                </h2>
                <div className="grid gap-4">
                  {pendingCancellationBookings.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))}
                </div>
              </section>
            )}

            {/* Pending Bookings */}
            {pendingBookings.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Pending ({pendingBookings.length})
                </h2>
                <div className="grid gap-4">
                  {pendingBookings.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))}
                </div>
              </section>
            )}

            {/* Past Bookings */}
            {pastBookings.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Past ({pastBookings.length})
                </h2>
                <div className="grid gap-4">
                  {pastBookings.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))}
                </div>
              </section>
            )}

            {/* Cancelled Bookings */}
            {cancelledBookings.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Cancelled ({cancelledBookings.length})
                </h2>
                <div className="grid gap-4">
                  {cancelledBookings.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function BookingCard({ booking }: { booking: Booking }) {
  const checkIn = new Date(booking.check_in_date)
  const checkOut = new Date(booking.check_out_date)
  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))

  const statusColors = {
    confirmed: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    cancelled: 'bg-red-100 text-red-800',
    pending_cancellation: 'bg-orange-100 text-orange-800',
  }

  const statusLabels: Record<string, string> = {
    confirmed: 'Confirmed',
    pending: 'Pending',
    cancelled: 'Cancelled',
    pending_cancellation: 'Pending Cancellation',
  }

  // Use hotel_name if available, otherwise fall back to provider_hotel_id
  const displayName = booking.hotel_name || booking.provider_hotel_id || 'Hotel Booking'

  return (
    <Link
      href={`/booking/${booking.id}`}
      className="block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{displayName}</h3>
          <p className="text-sm text-gray-600">Booking ID: {booking.id.slice(0, 8)}</p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold ${
            statusColors[booking.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
          }`}
        >
          {booking.cancelled_at ? 'Cancelled' : (statusLabels[booking.status] || booking.status)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-600">Check-in</p>
          <p className="font-medium text-gray-900">
            {checkIn.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </p>
        </div>
        <div>
          <p className="text-gray-600">Check-out</p>
          <p className="font-medium text-gray-900">
            {checkOut.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </p>
        </div>
        <div>
          <p className="text-gray-600">Duration</p>
          <p className="font-medium text-gray-900">{nights} night{nights !== 1 ? 's' : ''}</p>
        </div>
        <div>
          <p className="text-gray-600">Total Amount</p>
          <p className="font-medium text-gray-900">${Number(booking.total_price).toFixed(2)}</p>
        </div>
      </div>

      {booking.status === 'pending_cancellation' && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-orange-600 font-semibold">
            Cancellation request pending
          </p>
          <p className="text-sm text-gray-600 mt-1">
            We're confirming with the hotel. You'll receive an email within 24 hours.
          </p>
          {booking.cancellation_reason && (
            <p className="text-sm text-gray-600 mt-1">
              {booking.cancellation_reason}
            </p>
          )}
        </div>
      )}

      {booking.cancelled_at && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-red-600">
            Cancelled on {new Date(booking.cancelled_at).toLocaleDateString()}
          </p>
          {booking.refund_amount && Number(booking.refund_amount) > 0 && (
            <p className="text-sm text-green-600 mt-1">
              Refund: ${Number(booking.refund_amount).toFixed(2)}
            </p>
          )}
          {booking.cancellation_reason && (
            <p className="text-sm text-gray-600 mt-1">
              {booking.cancellation_reason}
            </p>
          )}
        </div>
      )}
    </Link>
  )
}
