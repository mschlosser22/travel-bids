/**
 * Database helpers for E2E tests
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

/**
 * Clean up test bookings (for teardown)
 */
export async function cleanupTestBookings(guestEmail: string) {
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .delete()
    .eq('guest_email', guestEmail)

  if (error) {
    console.error('Error cleaning up test bookings:', error)
  }

  return data
}

/**
 * Get booking by ID
 */
export async function getBooking(bookingId: string) {
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single()

  if (error) {
    throw new Error(`Failed to get booking: ${error.message}`)
  }

  return data
}

/**
 * Create a test booking directly in the database
 */
export async function createTestBooking(bookingData: any) {
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .insert(bookingData)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create test booking: ${error.message}`)
  }

  return data
}

/**
 * Make user an admin
 */
export async function makeUserAdmin(email: string) {
  const { data: user } = await supabaseAdmin.auth.admin.listUsers()
  const targetUser = user.users.find(u => u.email === email)

  if (!targetUser) {
    throw new Error(`User not found: ${email}`)
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(
    targetUser.id,
    {
      user_metadata: {
        ...targetUser.user_metadata,
        role: 'admin',
      },
    }
  )

  if (error) {
    throw new Error(`Failed to make user admin: ${error.message}`)
  }
}
