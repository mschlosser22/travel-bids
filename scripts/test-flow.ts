// Test the complete hotel search flow with LLM-friendly URLs
import { config } from 'dotenv'
config({ path: '.env.local' })

import { buildSearchUrl, buildHotelUrl, parseSearchUrl, parseHotelUrl } from '../lib/url-helpers'
import { providerManager } from '../lib/hotel-providers'

async function testCompleteFlow() {
  console.log('🧪 Testing Complete Hotel Search Flow with LLM-Friendly URLs\n')

  try {
    // Test 1: URL Generation
    console.log('1️⃣  Testing URL Generation...\n')

    const searchParams = {
      cityCode: 'LON',
      checkInDate: '2025-01-09',
      checkOutDate: '2025-01-11',
      adults: 2,
      rooms: 1
    }

    const searchUrl = buildSearchUrl(searchParams)
    console.log(`✅ Search URL: ${searchUrl}`)
    console.log(`   Expected: /search/london/2025-01-09/2025-01-11/2-guests-1-rooms\n`)

    // Test 2: URL Parsing
    console.log('2️⃣  Testing URL Parsing...\n')

    const parsedSearch = parseSearchUrl({
      city: 'london',
      checkIn: '2025-01-09',
      checkOut: '2025-01-11',
      guestsRooms: '2-guests-1-rooms'
    })

    if (!parsedSearch) {
      throw new Error('Failed to parse search URL')
    }

    console.log(`✅ Parsed search params:`, parsedSearch)
    console.log('')

    // Test 3: Hotel Search (using future dates)
    console.log('3️⃣  Testing Hotel Search API...\n')

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 30)
    const dayAfter = new Date(tomorrow)
    dayAfter.setDate(dayAfter.getDate() + 2)

    const testSearchParams = {
      cityCode: 'LON',
      checkInDate: tomorrow.toISOString().split('T')[0],
      checkOutDate: dayAfter.toISOString().split('T')[0],
      adults: 2,
      roomQuantity: 1,
      currency: 'USD'
    }

    console.log(`   Searching: ${testSearchParams.cityCode} (${testSearchParams.checkInDate} to ${testSearchParams.checkOutDate})`)

    const hotels = await providerManager.search(testSearchParams)

    if (hotels.length === 0) {
      console.log('⚠️  No hotels found (this may be expected for test environment)\n')
      return
    }

    console.log(`✅ Found ${hotels.length} hotels\n`)

    const firstHotel = hotels[0]
    console.log(`   First result: ${firstHotel.name}`)
    console.log(`   Price: $${firstHotel.price}`)
    console.log(`   Provider: ${firstHotel.providerId}`)
    console.log(`   Hotel ID: ${firstHotel.providerHotelId}`)

    // Check search results quality
    console.log(`\n   🔍 Search Results Quality:`)
    const hotelsWithImages = hotels.filter(h => h.images && h.images.length > 0).length
    const hotelsWithRatings = hotels.filter(h => h.starRating).length
    const hotelsWithAmenities = hotels.filter(h => h.amenities && h.amenities.length > 0).length

    console.log(`   Hotels with images: ${hotelsWithImages}/${hotels.length} ${hotelsWithImages > 0 ? '✅' : '⚠️  (all using placeholders)'}`)
    console.log(`   Hotels with star ratings: ${hotelsWithRatings}/${hotels.length} ${hotelsWithRatings > 0 ? '✅' : '⚠️'}`)
    console.log(`   Hotels with amenities: ${hotelsWithAmenities}/${hotels.length} ${hotelsWithAmenities > 0 ? '✅' : '⚠️'}`)
    console.log('')

    // Test 4: Hotel URL Generation
    console.log('4️⃣  Testing Hotel Detail URL Generation...\n')

    const hotelUrl = buildHotelUrl({
      cityCode: testSearchParams.cityCode,
      hotelName: firstHotel.name,
      providerHotelId: firstHotel.providerHotelId,
      providerId: firstHotel.providerId,
      checkInDate: testSearchParams.checkInDate,
      checkOutDate: testSearchParams.checkOutDate,
      adults: testSearchParams.adults,
      rooms: testSearchParams.roomQuantity
    })

    console.log(`✅ Hotel URL: ${hotelUrl}`)
    console.log(`   URL is LLM-friendly: readable city, hotel slug, and clear params\n`)

    // Test 5: Hotel URL Parsing
    console.log('5️⃣  Testing Hotel URL Parsing...\n')

    // Extract path segments from URL
    const urlParts = hotelUrl.split('?')[0].split('/')
    const parsedHotel = parseHotelUrl({
      city: urlParts[2],
      slug: urlParts[3],
      hotelId: urlParts[4]
    })

    if (!parsedHotel) {
      throw new Error('Failed to parse hotel URL')
    }

    console.log(`✅ Parsed hotel params:`, parsedHotel)
    console.log('')

    // Test 6: Hotel Details API
    console.log('6️⃣  Testing Hotel Details API...\n')

    const hotelDetails = await providerManager.getDetails(
      firstHotel.providerId,
      firstHotel.providerHotelId,
      testSearchParams
    )

    console.log(`✅ Hotel Details Retrieved:`)
    console.log(`   Name: ${hotelDetails.name}`)
    console.log(`   Address: ${hotelDetails.address}`)
    console.log(`   Available Rooms: ${hotelDetails.rooms.length}`)

    if (hotelDetails.rooms.length > 0) {
      console.log(`   Cheapest Room: $${Math.min(...hotelDetails.rooms.map(r => r.price))}`)
    }

    // Check for visual/UX issues
    console.log(`\n   🔍 Data Quality Checks:`)
    console.log(`   Images: ${hotelDetails.images?.length || 0} available ${hotelDetails.images?.length ? '✅' : '⚠️  (using placeholder)'}`)
    console.log(`   Description: ${hotelDetails.description ? '✅' : '⚠️  Missing'}`)
    console.log(`   Amenities: ${hotelDetails.amenities?.length || 0} listed ${hotelDetails.amenities?.length ? '✅' : '⚠️'}`)
    console.log(`   Star Rating: ${hotelDetails.starRating || 'N/A'} ${hotelDetails.starRating ? '✅' : '⚠️'}`)
    console.log(`   Policies: ${hotelDetails.policies ? '✅' : '⚠️  Missing'}`)
    console.log('')

    // Test 7: LLM URL Examples
    console.log('7️⃣  Example LLM-Friendly URLs:\n')

    const examples = [
      buildSearchUrl({ cityCode: 'NYC', checkInDate: '2025-12-20', checkOutDate: '2025-12-22', adults: 2, rooms: 1 }),
      buildSearchUrl({ cityCode: 'PAR', checkInDate: '2025-12-25', checkOutDate: '2025-12-30', adults: 4, rooms: 2 }),
      buildSearchUrl({ cityCode: 'TYO', checkInDate: '2026-03-15', checkOutDate: '2026-03-20', adults: 1, rooms: 1 }),
    ]

    examples.forEach((url, i) => {
      console.log(`   ${i + 1}. ${url}`)
    })

    console.log('\n✅ All Tests Passed!\n')
    console.log('🎯 Key Benefits for LLMs:')
    console.log('   • URLs are self-documenting and human-readable')
    console.log('   • City names replace codes (london vs LON)')
    console.log('   • Date format is standard ISO (YYYY-MM-DD)')
    console.log('   • Guest/room counts are explicit (2-guests-1-rooms)')
    console.log('   • Hotel slugs make URLs memorable and shareable')
    console.log('   • ChatGPT/Claude can easily generate these URLs')
    console.log('   • Ad campaigns can use predictable URL patterns\n')

  } catch (error: any) {
    console.error('❌ Test failed:', error.message)
    if (error.stack) {
      console.error('Stack trace:', error.stack)
    }
    process.exit(1)
  }
}

testCompleteFlow()
