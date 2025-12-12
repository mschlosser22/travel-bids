import { createClient } from '@/lib/supabase-server'

export type ActivityType =
  | 'requested'
  | 'provider_attempted'
  | 'provider_succeeded'
  | 'provider_failed'
  | 'set_pending'
  | 'admin_approved'
  | 'admin_rejected'
  | 'refund_processed'
  | 'refund_failed'
  | 'email_sent'
  | 'email_failed'

export type ActorRole = 'customer' | 'admin' | 'system'

export interface LogActivityParams {
  bookingId: string
  activityType: ActivityType
  actorEmail: string
  actorRole: ActorRole
  userId?: string | null
  details?: Record<string, any>
  notes?: string
  ipAddress?: string
  userAgent?: string
}

/**
 * Log a cancellation activity to the audit trail
 * This creates a permanent, immutable record for legal/compliance purposes
 */
export async function logCancellationActivity(params: LogActivityParams): Promise<void> {
  try {
    const supabase = await createClient()

    const { error } = await supabase.from('cancellation_activities').insert({
      booking_id: params.bookingId,
      user_id: params.userId,
      activity_type: params.activityType,
      actor_email: params.actorEmail,
      actor_role: params.actorRole,
      details: params.details || {},
      notes: params.notes,
      ip_address: params.ipAddress,
      user_agent: params.userAgent,
    })

    if (error) {
      console.error('[CancellationActivity] Failed to log activity:', error)
      // Don't throw - we don't want logging failures to break the flow
    } else {
      console.log(
        `[CancellationActivity] Logged: ${params.activityType} for booking ${params.bookingId} by ${params.actorEmail}`
      )
    }
  } catch (error) {
    console.error('[CancellationActivity] Exception logging activity:', error)
  }
}

/**
 * Get all activities for a booking (for admin view)
 */
export async function getBookingActivities(bookingId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('cancellation_activities')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[CancellationActivity] Failed to fetch activities:', error)
    return []
  }

  return data
}

/**
 * Get activity summary for a booking (counts by type)
 */
export async function getActivitySummary(bookingId: string) {
  const activities = await getBookingActivities(bookingId)

  return activities.reduce(
    (acc, activity) => {
      acc[activity.activity_type] = (acc[activity.activity_type] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )
}
