/**
 * Auth helper utilities for server components and API routes
 */

import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

/**
 * Get the current authenticated user
 * Returns null if not authenticated
 */
export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error) {
    console.error('Error getting user:', error)
    return null
  }

  return user
}

/**
 * Require authentication - redirect to login if not authenticated
 * Use in Server Components for protected pages
 */
export async function requireAuth() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return user
}

/**
 * Require authentication for API routes
 * Throws an error with status code instead of redirecting
 * Use in API Route Handlers (not Server Components)
 */
export async function requireAuthAPI() {
  const user = await getCurrentUser()

  if (!user) {
    const error = new Error('Unauthorized') as Error & { statusCode: number }
    error.statusCode = 401
    throw error
  }

  return user
}

/**
 * Check if user is authenticated (boolean)
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser()
  return !!user
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
