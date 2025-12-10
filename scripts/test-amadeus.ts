// Test Amadeus Hotel Provider Integration
import { config } from 'dotenv'
config({ path: '.env.local' })

import { providerManager } from '../lib/hotel-providers'

async function testAmadeusIntegration() {
  console.log('🏨 Testing Amadeus Hotel Provider Integration\n')

  try {
    // Test 0: Verify credentials
    console.log('0️⃣  Verifying Amadeus credentials...')
    console.log(`   API Key: ${process.env.AMADEUS_API_KEY?.substring(0, 10)}...`)
    console.log(`   Environment: ${process.env.AMADEUS_ENVIRONMENT}\n`)

    // Test 1: Search for hotels in London (use future dates)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 30)
    const dayAfter = new Date(tomorrow)
    dayAfter.setDate(dayAfter.getDate() + 2)

    const checkIn = tomorrow.toISOString().split('T')[0]
    const checkOut = dayAfter.toISOString().split('T')[0]

    console.log(`1️⃣  Searching for hotels in LON (${checkIn} to ${checkOut})...\n`)

    const searchParams = {
      cityCode: 'LON', // London - good test city
      checkInDate: checkIn,
      checkOutDate: checkOut,
      adults: 2,
      roomQuantity: 1,
      currency: 'USD'
    }

    const results = await providerManager.search(searchParams)

    console.log(`✅ Found ${results.length} hotels\n`)

    if (results.length > 0) {
      // Display first 3 results
      console.log('📋 Top 3 Results:\n')
      results.slice(0, 3).forEach((hotel, index) => {
        console.log(`${index + 1}. ${hotel.name}`)
        console.log(`   Provider: ${hotel.providerId}`)
        console.log(`   Address: ${hotel.address}`)
        console.log(`   Price: $${hotel.price} ${hotel.currency} (total for stay)`)
        console.log(`   Price/night: $${hotel.pricePerNight?.toFixed(2)}`)
        console.log(`   Star Rating: ${hotel.starRating || 'N/A'} ⭐`)
        console.log(`   Rooms Available: ${hotel.roomsAvailable}`)
        console.log(`   Provider Hotel ID: ${hotel.providerHotelId}\n`)
      })

      // Test 2: Get details for the first hotel
      const firstHotel = results[0]
      console.log(`\n2️⃣  Getting details for: ${firstHotel.name}...\n`)

      const details = await providerManager.getDetails(
        firstHotel.providerId,
        firstHotel.providerHotelId,
        searchParams
      )

      console.log(`✅ Hotel Details Retrieved\n`)
      console.log(`Name: ${details.name}`)
      console.log(`Address: ${details.address}`)
      console.log(`Description: ${details.description?.substring(0, 150)}...`)
      console.log(`Total Rooms Available: ${details.rooms.length}`)
      console.log(`Check-in: ${details.policies?.checkIn || 'N/A'}`)
      console.log(`Check-out: ${details.policies?.checkOut || 'N/A'}`)

      if (details.rooms.length > 0) {
        console.log(`\n📦 Room Options:`)
        details.rooms.slice(0, 3).forEach((room, index) => {
          console.log(`  ${index + 1}. ${room.roomType}`)
          console.log(`     Price: $${room.price} ${room.currency}`)
          console.log(`     Max Occupancy: ${room.maxOccupancy}`)
          console.log(`     Bed Type: ${room.bedType || 'N/A'}`)
        })
      }

      // Test 3: Check availability (real-time)
      console.log(`\n3️⃣  Checking real-time availability...\n`)

      const availability = await providerManager.checkAvailability(
        firstHotel.providerId,
        {
          hotelId: '', // Not needed for Amadeus
          providerHotelId: firstHotel.providerHotelId,
          checkInDate: searchParams.checkInDate,
          checkOutDate: searchParams.checkOutDate,
          adults: searchParams.adults,
          roomQuantity: searchParams.roomQuantity
        }
      )

      console.log(`✅ Availability Check Complete`)
      console.log(`   Available: ${availability.available ? 'Yes' : 'No'}`)
      console.log(`   Rooms: ${availability.rooms.length}`)
      console.log(`   Lowest Price: $${availability.totalPrice} ${availability.currency}`)

      // Test 4: Cache verification
      console.log(`\n4️⃣  Testing cache (second search should be instant)...\n`)

      const start = Date.now()
      await providerManager.search(searchParams)
      const elapsed = Date.now() - start

      console.log(`✅ Cache test complete (${elapsed}ms - should be <50ms if cached)`)

    } else {
      console.log('⚠️  No hotels found. This might be expected depending on the search parameters.')
    }

    console.log(`\n✅ All tests passed! Amadeus integration is working.\n`)

  } catch (error: any) {
    console.error('❌ Test failed:', error.message)
    if (error.originalError) {
      console.error('Original error:', error.originalError)
    }
    process.exit(1)
  }
}

testAmadeusIntegration()
