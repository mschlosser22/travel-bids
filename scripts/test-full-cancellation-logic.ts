/**
 * Comprehensive test script that simulates the cancellation route logic
 * for both HotelBeds and Amadeus providers
 */

import { createClient } from '@supabase/supabase-js'
import { getProviderManager } from '../lib/hotel-providers'

// Test booking IDs (created earlier)
const HOTELBEDS_BOOKING_ID = '5b061c5c-f70b-472e-b56a-00343873427a'
const AMADEUS_BOOKING_ID = '1c23c94a-2285-46f3-9d60-83b8eb8922ef'

async function testCancellationLogic(bookingId: string, providerName: string) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`Testing ${providerName.toUpperCase()} Cancellation Flow`)
  console.log('='.repeat(60))

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch booking
  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single()

  if (fetchError || !booking) {
    console.log('❌ Failed to fetch booking:', fetchError)
    return
  }

  console.log('\n📋 Booking Details:')
  console.log(`   ID: ${booking.id}`)
  console.log(`   Provider: ${booking.provider_name}`)
  console.log(`   Provider Booking ID: ${booking.provider_booking_id}`)
  console.log(`   Status: ${booking.status}`)
  console.log(`   Guest: ${booking.guest_email}`)

  // Simulate cancellation route logic (lines 104-171)
  let providerCancellationSuccessful = false
  let providerCancellationMessage = ''
  let provider = null

  try {
    const providerManager = getProviderManager()
    provider = providerManager.getProvider(booking.provider_name)

    console.log('\n🔍 Checking Line 108 Condition:')
    console.log(`   provider exists: ${!!provider}`)
    console.log(`   booking.provider_booking_id exists: ${!!booking.provider_booking_id}`)
    console.log(`   Will attempt provider cancellation: ${!!(provider && booking.provider_booking_id)}`)

    if (provider && booking.provider_booking_id) {
      console.log('\n✅ Line 108 check PASSED - Attempting provider cancellation...')

      const cancellationResult = await provider.cancelBooking(booking.provider_booking_id)

      console.log('\n📦 Provider API Response:')
      console.log(JSON.stringify(cancellationResult, null, 2))

      if (!cancellationResult.success) {
        providerCancellationMessage = cancellationResult.message || 'Provider cancellation not available'
        console.log(`\n⚠️  Provider cancellation FAILED: ${providerCancellationMessage}`)
        console.log('   → Will set status to: pending_cancellation')
        console.log('   → Will require manual processing: true')
      } else {
        providerCancellationSuccessful = true
        console.log('\n✅ Provider cancellation SUCCEEDED')
        console.log('   → Will set status to: cancelled')
        console.log('   → Will process refund automatically')
      }
    } else {
      console.log('\n❌ Line 108 check FAILED - Skipping provider cancellation')
      console.log('   → Going directly to manual processing flow (lines 174-248)')
    }
  } catch (providerError: any) {
    console.error('\n💥 Provider cancellation error:', providerError.message)
    providerCancellationMessage = 'Provider cancellation error'
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('SUMMARY:')
  console.log('='.repeat(60))
  console.log(`Provider: ${providerName}`)
  console.log(`Provider Booking ID Present: ${!!booking.provider_booking_id}`)
  console.log(`Provider API Called: ${!!(provider && booking.provider_booking_id)}`)
  console.log(`Provider Cancellation Successful: ${providerCancellationSuccessful}`)
  console.log(`Next Status: ${providerCancellationSuccessful ? 'cancelled' : 'pending_cancellation'}`)
  console.log(`Requires Manual Processing: ${!providerCancellationSuccessful}`)
  console.log('='.repeat(60))
}

async function runTests() {
  console.log('\n🧪 CANCELLATION FLOW TESTING\n')

  // Test HotelBeds booking
  await testCancellationLogic(HOTELBEDS_BOOKING_ID, 'HotelBeds')

  // Test Amadeus booking
  await testCancellationLogic(AMADEUS_BOOKING_ID, 'Amadeus')

  console.log('\n\n✅ All tests complete!\n')
}

runTests().catch(console.error)
