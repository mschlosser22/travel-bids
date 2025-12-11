/**
 * Cancellation Policy Management
 *
 * Priority:
 * 1. Manual override (admin set)
 * 2. Provider policy (from API)
 * 3. Default policy (fallback)
 */

export interface CancellationPolicy {
  description: string
  source: 'override' | 'provider' | 'default'
  canCancel: boolean
  refundPercentage: number // 0-100
  deadlineHours?: number // Hours before check-in
}

/**
 * Default cancellation policy (fallback)
 */
const DEFAULT_POLICY: CancellationPolicy = {
  description: 'Free cancellation up to 24 hours before check-in. No refund after that.',
  source: 'default',
  canCancel: true,
  refundPercentage: 100,
  deadlineHours: 24,
}

/**
 * Parse provider cancellation text into structured policy
 * This is best-effort - provider text format varies
 */
export function parseProviderPolicy(providerText: string): CancellationPolicy {
  const lowerText = providerText.toLowerCase()

  // Check if non-refundable
  if (lowerText.includes('non-refundable') || lowerText.includes('no refund')) {
    return {
      description: providerText,
      source: 'provider',
      canCancel: false,
      refundPercentage: 0,
    }
  }

  // Check for free cancellation
  if (lowerText.includes('free cancellation') || lowerText.includes('100% refund')) {
    // Try to extract deadline
    const hoursMatch = providerText.match(/(\d+)\s*hours?/i)
    const daysMatch = providerText.match(/(\d+)\s*days?/i)

    const deadlineHours = hoursMatch
      ? parseInt(hoursMatch[1])
      : daysMatch
        ? parseInt(daysMatch[1]) * 24
        : 24 // Default 24 hours

    return {
      description: providerText,
      source: 'provider',
      canCancel: true,
      refundPercentage: 100,
      deadlineHours,
    }
  }

  // Check for partial refund
  const percentMatch = providerText.match(/(\d+)%\s*refund/i)
  if (percentMatch) {
    return {
      description: providerText,
      source: 'provider',
      canCancel: true,
      refundPercentage: parseInt(percentMatch[1]),
    }
  }

  // Fallback: assume it's refundable if not explicitly stated otherwise
  return {
    description: providerText,
    source: 'provider',
    canCancel: true,
    refundPercentage: 100,
    deadlineHours: 24,
  }
}

/**
 * Get effective cancellation policy for a booking
 *
 * @param overridePolicy - Admin-set override policy text
 * @param providerPolicy - Policy from hotel provider
 * @returns Structured cancellation policy
 */
export function getCancellationPolicy(
  overridePolicy?: string | null,
  providerPolicy?: string | null
): CancellationPolicy {
  // Priority 1: Admin override
  if (overridePolicy) {
    return parseProviderPolicy(overridePolicy)
  }

  // Priority 2: Provider policy
  if (providerPolicy) {
    return parseProviderPolicy(providerPolicy)
  }

  // Priority 3: Default policy
  return DEFAULT_POLICY
}

/**
 * Calculate refund amount based on policy and timing
 *
 * @param policy - Cancellation policy
 * @param bookingAmount - Original booking amount
 * @param checkInDate - Check-in date
 * @param cancellationDate - When cancellation is being requested (default: now)
 * @returns Refund amount in dollars
 */
export function calculateRefundAmount(
  policy: CancellationPolicy,
  bookingAmount: number,
  checkInDate: Date,
  cancellationDate: Date = new Date()
): { refundAmount: number; canRefund: boolean; reason?: string } {
  // Check if cancellation is allowed
  if (!policy.canCancel) {
    return {
      refundAmount: 0,
      canRefund: false,
      reason: 'Non-refundable booking',
    }
  }

  // Check if within deadline
  if (policy.deadlineHours) {
    const hoursUntilCheckIn = (checkInDate.getTime() - cancellationDate.getTime()) / (1000 * 60 * 60)

    if (hoursUntilCheckIn < policy.deadlineHours) {
      return {
        refundAmount: 0,
        canRefund: false,
        reason: `Cancellation deadline passed (must cancel ${policy.deadlineHours}hrs before check-in)`,
      }
    }
  }

  // Calculate refund based on percentage
  const refundAmount = (bookingAmount * policy.refundPercentage) / 100

  return {
    refundAmount,
    canRefund: true,
  }
}

/**
 * Check if booking can be cancelled now
 */
export function canCancelNow(
  policy: CancellationPolicy,
  checkInDate: Date,
  currentDate: Date = new Date()
): { canCancel: boolean; reason?: string } {
  if (!policy.canCancel) {
    return { canCancel: false, reason: 'Non-refundable booking' }
  }

  if (policy.deadlineHours) {
    const hoursUntilCheckIn = (checkInDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60)

    if (hoursUntilCheckIn < policy.deadlineHours) {
      return {
        canCancel: false,
        reason: `Must cancel at least ${policy.deadlineHours} hours before check-in`,
      }
    }
  }

  return { canCancel: true }
}
