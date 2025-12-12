/**
 * Test data and utilities for E2E tests
 */

export const TEST_USERS = {
  customer: {
    email: 'ms122r3@gmail.com',
    name: 'Test Customer',
  },
  admin: {
    email: 'ms122r4@gmail.com',
    name: 'Admin User',
  },
}

export const TEST_SEARCH = {
  city: 'CHICAGO', // Use city name from our static database
  cityCode: 'CHI',
  checkIn: '2026-01-12',
  checkOut: '2026-01-13',
  guests: 2,
  rooms: 1,
}

export const TEST_GUEST_INFO = {
  name: 'John Doe',
  email: 'test@example.com',
  phone: '+1234567890',
}

/**
 * Generate future dates for testing
 */
export function getFutureDates(daysFromNow: number = 30, nights: number = 1) {
  const checkIn = new Date()
  checkIn.setDate(checkIn.getDate() + daysFromNow)

  const checkOut = new Date(checkIn)
  checkOut.setDate(checkOut.getDate() + nights)

  return {
    checkIn: checkIn.toISOString().split('T')[0],
    checkOut: checkOut.toISOString().split('T')[0],
  }
}

/**
 * Format date for URL parameters
 */
export function formatDateForURL(date: string): string {
  return date
}
