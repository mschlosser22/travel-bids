import { test, expect } from '@playwright/test'
import { TEST_SEARCH, getFutureDates } from './helpers/test-data'

test.describe('Hotel Search Flow', () => {
  test('should search for hotels and display results', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/')

    // Verify homepage loaded
    await expect(page.getByRole('heading', { name: /find your perfect hotel/i })).toBeVisible()

    // Fill in search form with future dates
    const dates = getFutureDates(30, 1)

    // Type in city autocomplete
    const cityInput = page.getByPlaceholder(/search for a city/i)
    await cityInput.fill('Chic')

    // Wait for autocomplete dropdown and select Chicago
    await page.getByText('CHICAGO').click()

    // Fill in dates and guests
    await page.getByLabel(/check.in/i).fill(dates.checkIn)
    await page.getByLabel(/check.out/i).fill(dates.checkOut)
    await page.getByLabel(/guests/i).selectOption(TEST_SEARCH.guests.toString())

    // Submit search
    await page.getByRole('button', { name: /search hotels/i }).click()

    // Wait for results page
    await page.waitForURL(/\/search/, { timeout: 10000 })

    // Verify search results are displayed
    await expect(page.getByText(/search results|hotels in/i)).toBeVisible()

    // Verify at least one hotel card is displayed
    const hotelCards = page.locator('[data-testid="hotel-card"]').first()
    await expect(hotelCards).toBeVisible()

    // Verify hotel card has required information
    await expect(hotelCards.getByRole('heading')).toBeVisible() // Hotel name
    await expect(hotelCards.getByText(/night/i)).toBeVisible() // Price per night
  })

  test('should handle city with no autocomplete results', async ({ page }) => {
    await page.goto('/')

    const dates = getFutureDates(30, 1)

    // Type non-existent city
    const cityInput = page.getByPlaceholder(/search for a city/i)
    await cityInput.fill('ZZZ123NotACity')

    // Wait for no results message
    await expect(page.getByText(/no cities found/i)).toBeVisible({ timeout: 5000 })
  })
})
