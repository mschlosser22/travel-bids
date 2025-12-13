// Test HotelBeds Provider Integration
// Verifies authentication, search, and data mapping

import { HotelBedsProvider } from '@/lib/hotel-providers/hotelbeds'

async function testHotelBeds() {
  console.log('🧪 Testing HotelBeds Provider Integration\n')

  try {
    // Initialize provider
    const provider = new HotelBedsProvider()
    console.log(`✅ Provider initialized: ${provider.name}`)
    console.log()

    // Test search
    console.log('📍 Testing hotel search...')
    const searchParams = {
      cityCode: 'NYC',
      checkInDate: '2025-12-20',
      checkOutDate: '2025-12-22',
      adults: 2,
      roomQuantity: 1,
      currency: 'USD'
    }

    console.log('Search params:', JSON.stringify(searchParams, null, 2))
    console.log()

    const results = await provider.search(searchParams)

    console.log(`\n✅ Search completed successfully!`)
    console.log(`   Found: ${results.length} hotels`)

    // Debug: Log raw response for first hotel
    if (results.length > 0) {
      console.log('\n🔍 Debug - First hotel raw metadata:')
      console.log(JSON.stringify(results[0].metadata, null, 2))
    }

    if (results.length > 0) {
      console.log('\nSample Results (first 3):')
      results.slice(0, 3).forEach((hotel, i) => {
        console.log(`\n${i + 1}. ${hotel.name}`)
        console.log(`   Price: $${hotel.price} ${hotel.currency}`)
        console.log(`   Address: ${hotel.address}`)
        console.log(`   Rating: ${hotel.starRating}⭐`)
        console.log(`   Rooms Available: ${hotel.roomsAvailable}`)
        console.log(`   Images: ${hotel.images?.length || 0}`)
        console.log(`   Provider ID: ${hotel.providerHotelId}`)
        console.log(`   GIATA ID: ${hotel.metadata?.giataId || 'N/A'}`)
      })

      // Test GIATA ID presence (critical for matching)
      const hotelsWithGiata = results.filter(h => h.metadata?.giataId)
      console.log(`\n📊 Hotels with GIATA IDs: ${hotelsWithGiata.length}/${results.length} (${(hotelsWithGiata.length / results.length * 100).toFixed(1)}%)`)

      if (hotelsWithGiata.length > 0) {
        console.log('✅ GIATA IDs found - perfect for hotel matching!')
      } else {
        console.log('⚠️  No GIATA IDs - matching will use embeddings + GPS')
      }
    }

    console.log('\n✅ HotelBeds integration test passed!')

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message)
    if (error.code) {
      console.error(`   Error code: ${error.code}`)
    }
    if (error.response) {
      console.error(`   Response:`, JSON.stringify(error.response, null, 2))
    }
    process.exit(1)
  }
}

testHotelBeds()
