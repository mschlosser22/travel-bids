// Fetch HotelBeds GIATA Codes from Content API
// Populates both hotelbeds_hotel_metadata cache AND canonical_hotels for Google Ads landing pages

import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface HotelBedsConfig {
  apiKey: string
  apiSecret: string
  environment: 'test' | 'production'
}

const config: HotelBedsConfig = {
  apiKey: process.env.HOTELBEDS_API_KEY!,
  apiSecret: process.env.HOTELBEDS_API_SECRET!,
  environment: (process.env.HOTELBEDS_ENVIRONMENT as any) || 'test'
}

const baseUrl = config.environment === 'production'
  ? 'https://api.hotelbeds.com'
  : 'https://api.test.hotelbeds.com'

/**
 * Generate authentication signature
 */
function generateSignature(): { signature: string; timestamp: number } {
  const timestamp = Math.floor(Date.now() / 1000)
  const message = config.apiKey + config.apiSecret + timestamp
  const signature = crypto.createHash('sha256').update(message).digest('hex')
  return { signature, timestamp }
}

/**
 * Make authenticated request to HotelBeds Content API
 */
async function contentApiRequest<T>(endpoint: string): Promise<T> {
  const { signature } = generateSignature()

  const url = `${baseUrl}${endpoint}`
  const headers = {
    'Api-key': config.apiKey,
    'X-Signature': signature,
    'Accept': 'application/json',
    'Accept-Encoding': 'gzip'
  }

  console.log(`Fetching: ${url}`)

  const response = await fetch(url, { headers })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(
      `HotelBeds API error: ${response.status} - ${errorData.error?.message || response.statusText}`
    )
  }

  return await response.json()
}

/**
 * Normalize hotel name for matching
 */
function normalizeHotelName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Generate SEO/LLM-friendly slug from hotel name and city
 * Example: "Marriott Marquis" + "New York" → "marriott-marquis-new-york"
 */
function generateSlug(hotelName: string, city: string | null): string {
  const combined = city ? `${hotelName} ${city}` : hotelName

  return combined
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove consecutive hyphens
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .substring(0, 100) // Limit length for URLs
}

/**
 * Ensure slug uniqueness by checking database and adding suffix if needed
 */
async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug
  let suffix = 2

  while (true) {
    const { data: existing } = await supabase
      .from('canonical_hotels')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (!existing) {
      return slug
    }

    slug = `${baseSlug}-${suffix}`
    suffix++
  }
}

/**
 * Generate name embedding for semantic search
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text
  })
  return response.data[0].embedding
}

/**
 * Fetch hotels for a specific destination
 */
async function fetchHotelsForDestination(destinationCode: string) {
  try {
    console.log(`\n📍 Fetching hotels for destination: ${destinationCode}`)

    // HotelBeds Content API: /hotel-content-api/1.0/hotels
    // Query params: destinationCode, fields (to include GIATA)
    const response = await contentApiRequest<any>(
      `/hotel-content-api/1.0/hotels?destinationCode=${destinationCode}&fields=all&from=1&to=1000`
    )

    const hotels = response.hotels || []
    console.log(`   Found ${hotels.length} hotels`)

    if (hotels.length === 0) return 0

    // 1. Save to hotelbeds_hotel_metadata cache
    const metadataRecords = hotels.map((hotel: any) => ({
      hotelbeds_code: hotel.code,
      giata_id: hotel.giataId || null,
      name: hotel.name?.content || hotel.name,
      country_code: hotel.countryCode,
      destination_code: destinationCode,
      category_code: hotel.categoryCode,
      latitude: hotel.coordinates?.latitude ? parseFloat(hotel.coordinates.latitude) : null,
      longitude: hotel.coordinates?.longitude ? parseFloat(hotel.coordinates.longitude) : null,
      data_source: 'content_api'
    }))

    const { error: metadataError } = await supabase
      .from('hotelbeds_hotel_metadata')
      .upsert(metadataRecords, {
        onConflict: 'hotelbeds_code',
        ignoreDuplicates: false
      })

    if (metadataError) {
      console.error(`   ❌ Error saving metadata:`, metadataError.message)
      return 0
    }

    const withGiata = metadataRecords.filter((r: any) => r.giata_id).length
    console.log(`   ✅ Saved ${metadataRecords.length} hotels to cache (${withGiata} with GIATA IDs)`)

    // 2. Create/update canonical hotels for Google Ads landing pages
    console.log(`   📝 Creating canonical hotels for Google Ads...`)

    let canonicalCreated = 0
    let canonicalUpdated = 0

    for (const hotel of hotels) {
      try {
        const hotelName = hotel.name?.content || hotel.name
        const normalizedName = normalizeHotelName(hotelName)
        const giataId = hotel.giataId || null
        const lat = hotel.coordinates?.latitude ? parseFloat(hotel.coordinates.latitude) : null
        const long = hotel.coordinates?.longitude ? parseFloat(hotel.coordinates.longitude) : null

        // Generate embedding for semantic search
        const embedding = await generateEmbedding(hotelName)

        // Generate SEO-friendly slug
        const city = hotel.city?.content || null
        const baseSlug = generateSlug(hotelName, city)
        const slug = await ensureUniqueSlug(baseSlug)

        // Check if canonical hotel exists by GIATA ID
        let canonicalId: string | null = null
        if (giataId) {
          const { data: existing } = await supabase
            .from('canonical_hotels')
            .select('id')
            .eq('giata_id', giataId)
            .maybeSingle()

          canonicalId = existing?.id || null
        }

        const canonicalData = {
          name: hotelName,
          normalized_name: normalizedName,
          slug: slug,
          latitude: lat,
          longitude: long,
          city: city,
          state: hotel.stateCode || null,
          country: hotel.countryCode || null,
          name_embedding: `[${embedding.join(',')}]`,
          star_rating: hotel.categoryCode ? parseInt(hotel.categoryCode.replace(/[^0-9]/g, '')) : null,
          giata_id: giataId,
          description: hotel.description?.content || null,
          images: hotel.images ? JSON.stringify(hotel.images.map((img: any) => img.path)) : null,
          amenities: hotel.facilities ? JSON.stringify(hotel.facilities.map((f: any) => f.description?.content || f.description)) : null,
          match_confidence: giataId ? 1.0 : 0.95,
          provider_count: 1,
          ad_approved: giataId ? true : false // Only approve for ads if we have GIATA ID
        }

        if (canonicalId) {
          // Update existing canonical hotel
          await supabase
            .from('canonical_hotels')
            .update(canonicalData)
            .eq('id', canonicalId)

          canonicalUpdated++
        } else {
          // Create new canonical hotel
          const { data: newCanonical } = await supabase
            .from('canonical_hotels')
            .insert(canonicalData)
            .select('id')
            .single()

          canonicalId = newCanonical?.id || null
          canonicalCreated++
        }

        // 3. Create provider mapping
        if (canonicalId) {
          // Check if mapping already exists
          const { data: existingMapping } = await supabase
            .from('provider_mappings')
            .select('id')
            .eq('provider_id', 'hotelbeds')
            .eq('provider_hotel_id', hotel.code.toString())
            .maybeSingle()

          const mappingData = {
            canonical_hotel_id: canonicalId,
            provider_id: 'hotelbeds',
            provider_hotel_id: hotel.code.toString(),
            match_confidence: giataId ? 1.0 : 0.95,
            match_method: giataId ? 'giata_id' : 'content_api',
            include_in_ads: giataId ? true : false,
            verified: giataId ? true : false,
            verified_by: 'content_api_fetch',
            verified_at: new Date().toISOString(),
            provider_data: JSON.stringify(hotel)
          }

          if (existingMapping) {
            await supabase
              .from('provider_mappings')
              .update(mappingData)
              .eq('id', existingMapping.id)
          } else {
            await supabase
              .from('provider_mappings')
              .insert(mappingData)
          }
        }

        // Rate limit embedding API
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (hotelError: any) {
        console.error(`   ⚠️  Error processing hotel ${hotel.code}:`, hotelError.message)
      }
    }

    console.log(`   ✅ Canonical hotels: ${canonicalCreated} created, ${canonicalUpdated} updated`)

    return hotels.length
  } catch (error: any) {
    console.error(`   ❌ Error fetching ${destinationCode}:`, error.message)
    return 0
  }
}

/**
 * Main function to fetch GIATA codes for popular destinations
 */
async function fetchGiataCodes() {
  console.log('🚀 Starting HotelBeds GIATA Code Fetch\n')

  // Popular US destinations (expand as needed)
  const destinations = [
    'NYC', // New York
    'LAX', // Los Angeles
    'CHI', // Chicago
    'MIA', // Miami
    'LAS', // Las Vegas
    'SFO', // San Francisco
    'ORL', // Orlando
    'SEA', // Seattle
    'BOS', // Boston
    'WAS'  // Washington DC
  ]

  let totalHotels = 0

  for (const destCode of destinations) {
    const count = await fetchHotelsForDestination(destCode)
    totalHotels += count

    // Rate limiting - wait 1 second between requests
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  console.log(`\n✅ Completed! Total hotels cached: ${totalHotels}`)

  // Summary stats
  const { data: stats } = await supabase
    .from('hotelbeds_hotel_metadata')
    .select('giata_id', { count: 'exact', head: true })

  const { data: withGiata } = await supabase
    .from('hotelbeds_hotel_metadata')
    .select('giata_id', { count: 'exact', head: true })
    .not('giata_id', 'is', null)

  console.log(`\n📊 Database Stats:`)
  console.log(`   Total hotels: ${stats?.length || 0}`)
  console.log(`   Hotels with GIATA: ${withGiata?.length || 0}`)
  console.log(`   Coverage: ${withGiata && stats ? ((withGiata.length / stats.length) * 100).toFixed(1) : 0}%`)
}

// Run the script
fetchGiataCodes()
  .then(() => {
    console.log('\n✅ GIATA cache populated successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
