import { test, expect } from '@playwright/test'
import { createTestBooking, cleanupTestBookings, getBooking, makeUserAdmin } from './helpers/db-helpers'
import { TEST_USERS, getFutureDates } from './helpers/test-data'

test.describe('Admin Approval Flow', () => {
  let pendingBookingId: string

  test.beforeAll(async () => {
    // Ensure admin user has admin role
    await makeUserAdmin(TEST_USERS.admin.email)
  })

  test.beforeEach(async () => {
    // Create a test booking with pending cancellation
    const dates = getFutureDates(2, 1) // Close to check-in for manual review

    const booking = await createTestBooking({
      guest_name: 'Pending Cancellation Guest',
      guest_email: 'pending@example.com',
      guest_phone: '+1234567890',
      hotel_name: 'Pending Cancellation Hotel',
      check_in_date: dates.checkIn,
      check_out_date: dates.checkOut,
      guest_count: 2,
      room_count: 1,
      total_price: 500,
      status: 'pending_cancellation',
      stripe_payment_status: 'paid',
      stripe_payment_intent_id: 'pi_test_pending_' + Date.now(),
    })

    pendingBookingId = booking.id
  })

  test.afterEach(async () => {
    // Cleanup test bookings
    await cleanupTestBookings('pending@example.com')
  })

  test('admin should see pending cancellations dashboard', async ({ page }) => {
    // Login as admin (you'll need to implement login flow)
    await page.goto('/admin/cancellations')

    // If not logged in, should redirect to login
    // After login, should see admin dashboard

    // Verify admin dashboard loaded
    await expect(
      page.getByRole('heading', { name: /pending cancellations|cancellation requests/i })
    ).toBeVisible()

    // Verify pending booking appears in list
    await expect(page.getByText('Pending Cancellation Hotel')).toBeVisible()
  })

  test('admin should see booking details and activity timeline', async ({ page }) => {
    await page.goto('/admin/cancellations')

    // Find the pending booking in the list
    const bookingRow = page.locator(`[data-booking-id="${pendingBookingId}"]`)

    // Click to view details
    await bookingRow.click()

    // Verify booking details are displayed
    await expect(page.getByText('Pending Cancellation Hotel')).toBeVisible()
    await expect(page.getByText('pending@example.com')).toBeVisible()

    // Verify activity timeline shows cancellation request
    await expect(page.getByText(/cancellation requested/i)).toBeVisible()
  })

  test('admin should be able to approve cancellation with notes', async ({ page }) => {
    await page.goto('/admin/cancellations')

    // Navigate to the pending booking
    const bookingRow = page.locator(`[data-booking-id="${pendingBookingId}"]`).first()
    await bookingRow.click()

    // Find and click approve button
    const approveButton = page.getByRole('button', { name: /approve|confirm cancellation/i })
    await approveButton.click()

    // Verify admin notes field appears
    await expect(page.getByLabel(/notes|reason|comments/i)).toBeVisible()

    // Fill in admin notes
    await page.getByLabel(/notes|reason|comments/i).fill('Approved due to customer request. Full refund issued.')

    // Confirm approval
    await page.getByRole('button', { name: /confirm|submit/i }).click()

    // Wait for success message
    await expect(page.getByText(/approved|refund processed|success/i)).toBeVisible({ timeout: 15000 })

    // Verify booking status updated to cancelled
    const booking = await getBooking(pendingBookingId)
    expect(booking.status).toBe('cancelled')
  })

  test('admin should be able to cancel approval action', async ({ page }) => {
    await page.goto('/admin/cancellations')

    const bookingRow = page.locator(`[data-booking-id="${pendingBookingId}"]`).first()
    await bookingRow.click()

    const approveButton = page.getByRole('button', { name: /approve|confirm cancellation/i })
    await approveButton.click()

    // Cancel the approval
    await page.getByRole('button', { name: /cancel|go back/i }).click()

    // Verify we're back to booking details
    await expect(page.getByText('Pending Cancellation Hotel')).toBeVisible()

    // Verify booking is still pending
    const booking = await getBooking(pendingBookingId)
    expect(booking.status).toBe('pending_cancellation')
  })

  test('admin should see approved cancellation removed from pending list', async ({ page }) => {
    // First approve the cancellation
    await page.goto('/admin/cancellations')

    const bookingRow = page.locator(`[data-booking-id="${pendingBookingId}"]`).first()
    await bookingRow.click()

    const approveButton = page.getByRole('button', { name: /approve|confirm cancellation/i })
    await approveButton.click()

    await page.getByLabel(/notes|reason|comments/i).fill('Test approval')
    await page.getByRole('button', { name: /confirm|submit/i }).click()

    // Wait for success
    await page.waitForTimeout(2000)

    // Navigate back to pending list
    await page.goto('/admin/cancellations')

    // Verify booking no longer appears in pending list
    await expect(
      page.locator(`[data-booking-id="${pendingBookingId}"]`)
    ).not.toBeVisible()
  })

  test('non-admin users should not access admin dashboard', async ({ page }) => {
    // Try to access admin dashboard without admin role
    await page.goto('/admin/cancellations')

    // Should be redirected to login or see unauthorized message
    await expect(
      page.getByText(/unauthorized|not authorized|access denied|sign in/i)
    ).toBeVisible()
  })

  test('admin should see refund amount in cancellation details', async ({ page }) => {
    await page.goto('/admin/cancellations')

    const bookingRow = page.locator(`[data-booking-id="${pendingBookingId}"]`).first()
    await bookingRow.click()

    // Verify refund amount is displayed
    await expect(page.getByText(/refund|amount/i)).toBeVisible()
    await expect(page.getByText(/500|5.00/)).toBeVisible() // Total price or formatted amount
  })
})
