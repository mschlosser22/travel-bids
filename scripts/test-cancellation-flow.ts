/**
 * Test script to verify cancellation flow for both providers
 * Tests that when provider_booking_id exists, the system attempts provider API cancellation
 */

import { getProviderManager } from '../lib/hotel-providers'

async function testCancellationFlow() {
  console.log('=== Testing Cancellation Flow ===\n')

  const providerManager = getProviderManager()

  // Test 1: HotelBeds cancellation
  console.log('TEST 1: HotelBeds Provider')
  console.log('----------------------------')
  const hotelbeds = providerManager.getProvider('hotelbeds')

  if (!hotelbeds) {
    console.log('❌ HotelBeds provider not found')
  } else {
    console.log('✅ HotelBeds provider loaded')
    console.log('Provider name:', hotelbeds.name)
    console.log('Has cancelBooking method:', typeof hotelbeds.cancelBooking === 'function')

    // Test with fake booking ID
    try {
      console.log('\nTesting cancelBooking with fake ID: HB-TEST-BOOKING-12345')
      const result = await hotelbeds.cancelBooking('HB-TEST-BOOKING-12345')
      console.log('Result:', JSON.stringify(result, null, 2))
    } catch (error: any) {
      console.log('Expected error (fake booking ID):', error.message)
    }
  }

  console.log('\n')

  // Test 2: Amadeus cancellation
  console.log('TEST 2: Amadeus Provider')
  console.log('-------------------------')
  const amadeus = providerManager.getProvider('amadeus')

  if (!amadeus) {
    console.log('❌ Amadeus provider not found')
  } else {
    console.log('✅ Amadeus provider loaded')
    console.log('Provider name:', amadeus.name)
    console.log('Has cancelBooking method:', typeof amadeus.cancelBooking === 'function')

    // Test with fake booking ID
    try {
      console.log('\nTesting cancelBooking with fake ID: AM-TEST-BOOKING-67890')
      const result = await amadeus.cancelBooking('AM-TEST-BOOKING-67890')
      console.log('Result:', JSON.stringify(result, null, 2))
    } catch (error: any) {
      console.log('Expected error (fake booking ID):', error.message)
    }
  }

  console.log('\n=== Test Complete ===')
}

testCancellationFlow().catch(console.error)
