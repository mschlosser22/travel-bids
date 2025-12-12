import { test, expect } from '@playwright/test'
import { TEST_SEARCH, TEST_GUEST_INFO, getFutureDates } from './helpers/test-data'
import { cleanupTestBookings } from './helpers/db-helpers'

test.describe('Booking Creation Flow', () => {
  test.afterEach(async () => {
    // Cleanup test bookings after each test
    await cleanupTestBookings(TEST_GUEST_INFO.email)
  })

  test('should complete full booking flow from search to payment', async ({ page }) => {
    // Navigate and search for hotels
    await page.goto('/')

    const dates = getFutureDates(30, 1)

    // Use autocomplete for city
    const cityInput = page.getByPlaceholder(/search for a city/i)
    await cityInput.fill('Chic')
    await page.getByText('CHICAGO').click()

    await page.getByLabel(/check.in/i).fill(dates.checkIn)
    await page.getByLabel(/check.out/i).fill(dates.checkOut)
    await page.getByLabel(/guests/i).selectOption(TEST_SEARCH.guests.toString())

    await page.getByRole('button', { name: /search hotels/i }).click()

    await page.waitForURL(/\/search/, { timeout: 10000 })

    // Select first hotel
    const firstHotel = page.locator('[data-testid="hotel-card"]').first()
    await expect(firstHotel).toBeVisible()

    await firstHotel.getByRole('button', { name: /book now|select/i }).click()

    // Wait for booking page
    await page.waitForURL(/\/book/)

    // Fill in guest information
    await page.getByLabel(/name/i).fill(TEST_GUEST_INFO.name)
    await page.getByLabel(/email/i).fill(TEST_GUEST_INFO.email)
    await page.getByLabel(/phone/i).fill(TEST_GUEST_INFO.phone)

    // Proceed to payment
    await page.getByRole('button', { name: /continue to payment/i }).click()

    // Wait for Stripe checkout or payment page
    await page.waitForURL(/checkout|payment/)

    // Verify we reached payment step
    await expect(page.getByText(/payment/i)).toBeVisible()
  })

  test('should show validation errors for invalid guest info', async ({ page }) => {
    await page.goto('/')

    const dates = getFutureDates(30, 1)

    const cityInput = page.getByPlaceholder(/search for a city/i)
    await cityInput.fill('Chic')
    await page.getByText('CHICAGO').click()

    await page.getByLabel(/check.in/i).fill(dates.checkIn)
    await page.getByLabel(/check.out/i).fill(dates.checkOut)
    await page.getByLabel(/guests/i).selectOption(TEST_SEARCH.guests.toString())

    await page.getByRole('button', { name: /search hotels/i }).click()
    await page.waitForURL(/\/search/, { timeout: 10000 })

    const firstHotel = page.locator('[data-testid="hotel-card"]').first()
    await firstHotel.getByRole('button', { name: /book now|select/i }).click()

    await page.waitForURL(/\/book/)

    // Try to submit with empty fields
    await page.getByRole('button', { name: /continue to payment/i }).click()

    // Verify validation errors appear
    await expect(page.getByText(/required|please enter/i).first()).toBeVisible()

    // Fill invalid email
    await page.getByLabel(/name/i).fill(TEST_GUEST_INFO.name)
    await page.getByLabel(/email/i).fill('invalid-email')
    await page.getByLabel(/phone/i).fill(TEST_GUEST_INFO.phone)

    await page.getByRole('button', { name: /continue to payment/i }).click()

    // Verify email validation error
    await expect(page.getByText(/valid email/i)).toBeVisible()
  })

  test('should display booking summary with correct details', async ({ page }) => {
    await page.goto('/')

    const dates = getFutureDates(30, 1)

    const cityInput = page.getByPlaceholder(/search for a city/i)
    await cityInput.fill('Chic')
    await page.getByText('CHICAGO').click()

    await page.getByLabel(/check.in/i).fill(dates.checkIn)
    await page.getByLabel(/check.out/i).fill(dates.checkOut)
    await page.getByLabel(/guests/i).selectOption(TEST_SEARCH.guests.toString())

    await page.getByRole('button', { name: /search hotels/i }).click()
    await page.waitForURL(/\/search/, { timeout: 10000 })

    const firstHotel = page.locator('[data-testid="hotel-card"]').first()
    const hotelName = await firstHotel.getByRole('heading').textContent()

    await firstHotel.getByRole('button', { name: /book now|select/i }).click()
    await page.waitForURL(/\/book/)

    // Verify booking summary displays correct information
    await expect(page.getByText(hotelName!)).toBeVisible()
    await expect(page.getByText(dates.checkIn)).toBeVisible()
    await expect(page.getByText(dates.checkOut)).toBeVisible()
    await expect(page.getByText(`${TEST_SEARCH.guests} guests`)).toBeVisible()
  })
})
