// Test Search API with Hotel Matching
// Verifies the complete flow: search → match → deduplicate → merge

async function testSearchAPI() {
  console.log('🧪 Testing Hotel Search API with Matching Integration\n')

  const testRequest = {
    cityCode: 'NYC',
    checkInDate: '2025-12-20',
    checkOutDate: '2025-12-22',
    adults: 2,
    roomQuantity: 1
  }

  console.log('Request:', JSON.stringify(testRequest, null, 2))
  console.log()

  try {
    const response = await fetch('http://localhost:3000/api/hotels/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testRequest)
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Error Response:', JSON.stringify(data, null, 2))
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    console.log('Response Summary:')
    console.log(`  ✓ Success: ${data.success}`)
    console.log(`  ✓ Hotels found: ${data.count}`)

    if (data.metadata) {
      console.log(`  ✓ Provider results: ${data.metadata.totalProviderResults}`)
      console.log(`  ✓ After deduplication: ${data.metadata.deduplicatedTo}`)
      console.log(`  ✓ Deduplication rate: ${((1 - data.metadata.deduplicatedTo / data.metadata.totalProviderResults) * 100).toFixed(1)}%`)
    }

    console.log()

    if (data.hotels && data.hotels.length > 0) {
      console.log('Sample Hotel (cheapest):')
      const hotel = data.hotels[0]
      console.log(`  Name: ${hotel.name}`)
      console.log(`  Price: $${hotel.price} ${hotel.currency}`)
      console.log(`  Provider: ${hotel.selectedProvider.name}`)
      console.log(`  Canonical ID: ${hotel.canonicalId}`)

      if (hotel.allOffers && hotel.allOffers.length > 1) {
        console.log(`  All Offers:`)
        hotel.allOffers.forEach((offer: any, i: number) => {
          console.log(`    ${i + 1}. ${offer.providerName}: $${offer.price} (${(offer.confidence * 100).toFixed(0)}% confidence)`)
        })
      }

      console.log(`  Images: ${hotel.images?.length || 0}`)
      console.log(`  Amenities: ${hotel.amenities?.length || 0}`)

      if (hotel.dataSources) {
        console.log(`  Data Sources:`)
        console.log(`    - Pricing: ${hotel.dataSources.pricing}`)
        console.log(`    - Images: ${hotel.dataSources.images?.join(', ')}`)
      }
    }

    console.log('\n✅ Search API test completed successfully!')

  } catch (error: any) {
    console.error('❌ Test failed:', error.message)
    process.exit(1)
  }
}

testSearchAPI()
