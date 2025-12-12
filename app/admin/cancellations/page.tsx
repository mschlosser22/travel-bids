import { requireAdmin } from '@/lib/admin-helpers'
import { createClient } from '@/lib/supabase-server'
import { getBookingActivities } from '@/lib/cancellation-activity-logger'
import { redirect } from 'next/navigation'
import { ApproveButton } from './approve-button'
import Link from 'next/link'

export default async function AdminCancellationsPage() {
  try {
    // Require admin authentication
    await requireAdmin()
  } catch (error) {
    redirect('/login?redirect=/admin/cancellations')
  }

  const supabase = await createClient()

  // Fetch pending cancellations
  const { data: pendingBookings, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('status', 'pending_cancellation')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching pending cancellations:', error)
  }

  const bookingsWithActivities = await Promise.all(
    (pendingBookings || []).map(async (booking) => {
      const activities = await getBookingActivities(booking.id)
      return { ...booking, activities }
    })
  )

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Pending Cancellations
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Review and approve cancellation requests that require manual confirmation with providers
            </p>
          </div>
          <Link
            href="/admin"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
          >
            ← Back to Admin
          </Link>
        </div>

        {!bookingsWithActivities || bookingsWithActivities.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-gray-600 text-center">
              No pending cancellations at this time.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {bookingsWithActivities.map((booking) => (
              <div
                key={booking.id}
                className="bg-white shadow rounded-lg overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-gray-900">
                        {booking.hotel_name || booking.provider_hotel_id}
                      </h2>
                      <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Guest:</span>
                          <p className="text-gray-600">{booking.guest_name}</p>
                          <p className="text-gray-600">{booking.guest_email}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Dates:</span>
                          <p className="text-gray-600">
                            Check-in: {new Date(booking.check_in_date).toLocaleDateString()}
                          </p>
                          <p className="text-gray-600">
                            Check-out: {new Date(booking.check_out_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Booking Details:</span>
                          <p className="text-gray-600">
                            Provider: {booking.provider_name}
                          </p>
                          {booking.provider_booking_id && (
                            <p className="text-gray-600">
                              Provider ID: {booking.provider_booking_id}
                            </p>
                          )}
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Payment:</span>
                          <p className="text-gray-600">
                            Total: ${Number(booking.total_amount).toFixed(2)}
                          </p>
                          <p className="text-gray-600">
                            Booking ID: {booking.id.slice(0, 8)}...
                          </p>
                        </div>
                      </div>
                      {booking.cancellation_reason && (
                        <div className="mt-4">
                          <span className="font-medium text-gray-700">Cancellation Reason:</span>
                          <p className="text-gray-600 mt-1">{booking.cancellation_reason}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Activity Timeline */}
                  {booking.activities && booking.activities.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <h3 className="text-sm font-medium text-gray-900 mb-4">
                        Activity Timeline
                      </h3>
                      <div className="space-y-3">
                        {booking.activities.map((activity: any) => (
                          <div
                            key={activity.id}
                            className="flex text-sm"
                          >
                            <div className="flex-shrink-0 w-32 text-gray-500">
                              {new Date(activity.created_at).toLocaleString()}
                            </div>
                            <div className="flex-1">
                              <span className="font-medium text-gray-700">
                                {activity.activity_type.replace(/_/g, ' ')}
                              </span>
                              <span className="text-gray-600">
                                {' '}by {activity.actor_email}
                              </span>
                              {activity.notes && (
                                <p className="text-gray-600 mt-1 italic">
                                  Note: {activity.notes}
                                </p>
                              )}
                              {activity.details && Object.keys(activity.details).length > 0 && (
                                <details className="mt-1">
                                  <summary className="text-xs text-gray-500 cursor-pointer">
                                    View details
                                  </summary>
                                  <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-x-auto">
                                    {JSON.stringify(activity.details, null, 2)}
                                  </pre>
                                </details>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Admin Actions */}
                  <ApproveButton
                    bookingId={booking.id}
                    guestName={booking.guest_name}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
