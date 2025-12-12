import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export type UserRole = 'customer' | 'admin' | 'super_admin'

/**
 * Require admin authentication
 * Throws if user is not authenticated or not an admin
 */
export async function requireAdmin() {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login?redirect=/admin')
  }

  const role = user.user_metadata?.role as UserRole

  if (role !== 'admin' && role !== 'super_admin') {
    throw new Error('Unauthorized: Admin access required')
  }

  return { user, role }
}

/**
 * Require admin authentication for API routes
 * Throws error with status code instead of redirecting
 */
export async function requireAdminAPI() {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    const authError = new Error('Unauthorized') as Error & { statusCode: number }
    authError.statusCode = 401
    throw authError
  }

  const role = user.user_metadata?.role as UserRole

  if (role !== 'admin' && role !== 'super_admin') {
    const forbiddenError = new Error('Forbidden: Admin access required') as Error & { statusCode: number }
    forbiddenError.statusCode = 403
    throw forbiddenError
  }

  return { user, role }
}

/**
 * Check if current user is an admin (non-throwing)
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return false

    const role = user.user_metadata?.role as UserRole
    return role === 'admin' || role === 'super_admin'
  } catch {
    return false
  }
}

/**
 * Get current user's role
 */
export async function getUserRole(): Promise<UserRole | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    return (user.user_metadata?.role as UserRole) || 'customer'
  } catch {
    return null
  }
}
