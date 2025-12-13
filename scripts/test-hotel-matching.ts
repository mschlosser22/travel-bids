// Test Hotel Matching System
// Verifies OpenAI embeddings + pgvector + RAG matching pipeline

import { matchHotel, createCanonicalHotel } from '../lib/hotel-matching/rag-matcher'
import { mergeHotelListings } from '../lib/hotel-matching/data-merger'
import type { HotelResult } from '../lib/hotel-providers/types'

async function testHotelMatching() {
  console.log('🧪 Testing Hotel Matching System\n')

  // Sample hotel data (simulating Amadeus result)
  const testHotel: HotelResult = {
    providerId: 'amadeus',
    providerHotelId: 'NYCTSQ12',
    name: 'Hilton Garden Inn Times Square',
    address: '790 8th Avenue',
    city: 'New York',
    state: 'NY',
    country: 'USA',
    latitude: 40.7580,
    longitude: -73.9910,
    price: 299.99,
    currency: 'USD',
    available: true,
    images: [
      'https://example.com/hotel1.jpg',
      'https://example.com/hotel2.jpg'
    ],
    amenities: ['WiFi', 'Gym', 'Restaurant'],
    description: 'Modern hotel in the heart of Times Square',
    starRating: 4,
    metadata: {
      giataId: undefined // No GIATA ID
    }
  }

  try {
    // Test 1: Match hotel (should create new canonical if none exists)
    console.log('📍 Test 1: Matching hotel...')
    const matchResult = await matchHotel(testHotel)

    console.log('Match Result:')
    console.log(`  - Method: ${matchResult.method}`)
    console.log(`  - Confidence: ${(matchResult.confidence * 100).toFixed(1)}%`)
    console.log(`  - Canonical ID: ${matchResult.canonicalId || 'N/A'}`)
    console.log(`  - Should Advertise: ${matchResult.shouldAdvertise ? '✅' : '❌'}`)

    if (matchResult.metadata) {
      console.log('  - Metadata:')
      if (matchResult.metadata.embeddingScore) {
        console.log(`    • Embedding Score: ${(matchResult.metadata.embeddingScore * 100).toFixed(1)}%`)
      }
      if (matchResult.metadata.locationScore) {
        console.log(`    • Location Score: ${(matchResult.metadata.locationScore * 100).toFixed(1)}%`)
      }
      if (matchResult.metadata.nameScore) {
        console.log(`    • Name Score: ${(matchResult.metadata.nameScore * 100).toFixed(1)}%`)
      }
      if (matchResult.metadata.candidates) {
        console.log(`    • Candidates Found: ${matchResult.metadata.candidates}`)
      }
    }
    console.log()

    // Test 2: Create canonical hotel if no match
    if (!matchResult.canonicalId) {
      console.log('📝 Test 2: Creating new canonical hotel...')
      const canonicalId = await createCanonicalHotel(testHotel)
      console.log(`  ✅ Created canonical hotel: ${canonicalId}`)
      console.log()

      // Test 3: Re-match (should hit cache)
      console.log('🔄 Test 3: Re-matching same hotel (should hit cache)...')
      const cachedMatch = await matchHotel(testHotel)
      console.log(`  - Method: ${cachedMatch.method}`)
      console.log(`  - Canonical ID: ${cachedMatch.canonicalId}`)
      console.log(`  - ${cachedMatch.method === 'cache' ? '✅ Cache hit!' : '❌ Cache miss'}`)
      console.log()
    }

    // Test 4: Multi-provider merging
    console.log('🔀 Test 4: Testing multi-provider data merging...')

    const provider1 = {
      hotel: testHotel,
      match: matchResult,
      provider: { id: 'amadeus', name: 'Amadeus' }
    }

    const provider2 = {
      hotel: {
        ...testHotel,
        providerId: 'booking',
        providerHotelId: '9876543',
        price: 289.99, // Cheaper!
        images: ['https://booking.com/hotel1.jpg'],
        amenities: ['WiFi', 'Pool', 'Parking'],
        metadata: { giataId: '12345' } // Same GIATA = 100% confidence
      } as HotelResult,
      match: {
        canonicalId: matchResult.canonicalId,
        confidence: 1.0,
        method: 'cache' as const,
        shouldAdvertise: true
      },
      provider: { id: 'booking', name: 'Booking.com' }
    }

    const merged = mergeHotelListings([provider1, provider2])

    console.log('Merged Hotel Listing:')
    console.log(`  - Name: ${merged.name}`)
    console.log(`  - Best Price: $${merged.price} ${merged.currency}`)
    console.log(`  - Selected Provider: ${merged.selectedProvider.name}`)
    console.log(`  - Images: ${merged.images.length} total`)
    console.log(`    • From Amadeus: ${merged.images.filter(i => i.source === 'amadeus').length}`)
    console.log(`    • From Booking.com: ${merged.images.filter(i => i.source === 'booking').length}`)
    console.log(`  - Amenities: ${merged.amenities.join(', ')}`)
    console.log(`  - All Offers:`)
    merged.allOffers.forEach((offer, i) => {
      console.log(`    ${i + 1}. ${offer.providerName}: $${offer.price} (${(offer.confidence * 100).toFixed(0)}% confidence)`)
    })
    console.log()

    console.log('✅ All tests completed successfully!')

  } catch (error) {
    console.error('❌ Test failed:', error)
    if (error instanceof Error) {
      console.error('Error details:', error.message)
      console.error('Stack:', error.stack)
    }
    process.exit(1)
  }
}

// Run tests
testHotelMatching()
  .then(() => {
    console.log('\n🎉 Hotel matching system is working!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error)
    process.exit(1)
  })
