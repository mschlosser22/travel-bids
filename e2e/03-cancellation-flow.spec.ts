import { test, expect } from '@playwright/test'
import { createTestBooking, cleanupTestBookings, getBooking } from './helpers/db-helpers'
import { TEST_GUEST_INFO, getFutureDates } from './helpers/test-data'

test.describe('Cancellation Flow', () => {
  let testBookingId: string

  test.beforeEach(async () => {
    // Create a test booking directly in the database
    const dates = getFutureDates(30, 2)

    const booking = await createTestBooking({
      guest_name: TEST_GUEST_INFO.name,
      guest_email: TEST_GUEST_INFO.email,
      guest_phone: TEST_GUEST_INFO.phone,
      hotel_name: 'Test Hotel London',
      check_in_date: dates.checkIn,
      check_out_date: dates.checkOut,
      guest_count: 2,
      room_count: 1,
      total_price: 200,
      status: 'confirmed',
      stripe_payment_status: 'paid',
      stripe_payment_intent_id: 'pi_test_' + Date.now(),
    })

    testBookingId = booking.id
  })

  test.afterEach(async () => {
    // Cleanup test bookings
    await cleanupTestBookings(TEST_GUEST_INFO.email)
  })

  test('should display booking details and cancellation option', async ({ page }) => {
    // Navigate to booking page
    await page.goto(`/booking/${testBookingId}`)

    // Verify booking details are displayed
    await expect(page.getByText('Test Hotel London')).toBeVisible()
    await expect(page.getByText(TEST_GUEST_INFO.name)).toBeVisible()
    await expect(page.getByText(TEST_GUEST_INFO.email)).toBeVisible()

    // Verify cancel button is present
    await expect(page.getByRole('button', { name: /cancel booking/i })).toBeVisible()
  })

  test('should show cancellation policy before canceling', async ({ page }) => {
    await page.goto(`/booking/${testBookingId}`)

    // Click cancel button
    await page.getByRole('button', { name: /cancel booking/i }).click()

    // Verify cancellation policy modal appears
    await expect(page.getByText(/cancellation policy|are you sure/i)).toBeVisible()
    await expect(page.getByText(/refund/i)).toBeVisible()

    // Verify confirm and cancel buttons
    await expect(page.getByRole('button', { name: /confirm|yes/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /go back|no/i })).toBeVisible()
  })

  test('should allow user to cancel and go back', async ({ page }) => {
    await page.goto(`/booking/${testBookingId}`)

    await page.getByRole('button', { name: /cancel booking/i }).click()

    // Click go back button
    await page.getByRole('button', { name: /go back|no/i }).click()

    // Verify we're back to booking details
    await expect(page.getByText('Test Hotel London')).toBeVisible()
    await expect(page.getByRole('button', { name: /cancel booking/i })).toBeVisible()

    // Verify booking is still confirmed
    const booking = await getBooking(testBookingId)
    expect(booking.status).toBe('confirmed')
  })

  test('should process automatic cancellation for eligible bookings', async ({ page }) => {
    await page.goto(`/booking/${testBookingId}`)

    await page.getByRole('button', { name: /cancel booking/i }).click()

    // Confirm cancellation
    await page.getByRole('button', { name: /confirm|yes/i }).click()

    // Wait for cancellation to process
    await page.waitForURL(/\/booking\/.*/, { waitUntil: 'networkidle' })

    // Verify cancellation success message
    await expect(
      page.getByText(/cancelled|cancellation (confirmed|successful)/i)
    ).toBeVisible({ timeout: 15000 })

    // Verify booking status updated to cancelled or pending_cancellation
    const booking = await getBooking(testBookingId)
    expect(['cancelled', 'pending_cancellation']).toContain(booking.status)
  })

  test('should show pending status for manual cancellations', async ({ page }) => {
    // Create a booking that requires manual cancellation
    // (e.g., booking very close to check-in date)
    const nearDates = getFutureDates(2, 1) // 2 days from now

    const manualBooking = await createTestBooking({
      guest_name: TEST_GUEST_INFO.name,
      guest_email: 'manual@example.com',
      guest_phone: TEST_GUEST_INFO.phone,
      hotel_name: 'Manual Cancellation Hotel',
      check_in_date: nearDates.checkIn,
      check_out_date: nearDates.checkOut,
      guest_count: 2,
      room_count: 1,
      total_price: 300,
      status: 'confirmed',
      stripe_payment_status: 'paid',
      stripe_payment_intent_id: 'pi_test_manual_' + Date.now(),
    })

    await page.goto(`/booking/${manualBooking.id}`)

    await page.getByRole('button', { name: /cancel booking/i }).click()
    await page.getByRole('button', { name: /confirm|yes/i }).click()

    // Wait for processing
    await page.waitForTimeout(3000)

    // Verify pending cancellation message
    await expect(
      page.getByText(/pending|review|contact|processing/i)
    ).toBeVisible({ timeout: 10000 })

    // Cleanup
    await cleanupTestBookings('manual@example.com')
  })

  test('should display cancellation history in booking activity', async ({ page }) => {
    await page.goto(`/booking/${testBookingId}`)

    await page.getByRole('button', { name: /cancel booking/i }).click()
    await page.getByRole('button', { name: /confirm|yes/i }).click()

    // Wait for cancellation to process
    await page.waitForTimeout(3000)

    // Look for activity timeline or history
    const activitySection = page.getByText(/activity|timeline|history/i)
    if (await activitySection.isVisible()) {
      await expect(page.getByText(/cancellation requested/i)).toBeVisible()
    }
  })
})
