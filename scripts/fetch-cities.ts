/**
 * Script to fetch popular cities from Amadeus API and generate static data
 * Run with: npx tsx scripts/fetch-cities.ts
 */

import Amadeus from 'amadeus'
import fs from 'fs'
import path from 'path'

interface City {
  name: string
  iataCode: string
  latitude: number
  longitude: number
  countryCode: string
}

// Top cities to fetch (covers ~90% of hotel searches)
const POPULAR_CITY_CODES = [
  // USA
  'NYC', 'LAX', 'MIA', 'LAS', 'SFO', 'CHI', 'ORL', 'SEA', 'BOS', 'WAS',
  'ATL', 'DEN', 'PHX', 'SAN', 'DAL', 'HOU', 'PHI', 'AUS', 'POR', 'DET',

  // Europe
  'LON', 'PAR', 'ROM', 'BCN', 'AMS', 'BER', 'MAD', 'VIE', 'MIL', 'MUC',
  'DUB', 'PRG', 'LIS', 'ATH', 'BUD', 'WAW', 'CPH', 'STO', 'HEL', 'OSL',
  'ZRH', 'GVA', 'BRU', 'VCE', 'FLR', 'NAP', 'EDI', 'MAN', 'GLA',

  // Asia Pacific
  'TYO', 'SIN', 'HKG', 'BKK', 'DXB', 'SEL', 'KUL', 'SHA', 'BJS', 'DEL',
  'MNL', 'TPE', 'JKT', 'SYD', 'MEL', 'BNE', 'AKL', 'HAN', 'SGN', 'BOM',

  // Latin America
  'MEX', 'CUN', 'SAO', 'RIO', 'BUE', 'LIM', 'BOG', 'SCL', 'GUA', 'PTY',

  // Middle East & Africa
  'CAI', 'JNB', 'CPT', 'NBO', 'DOH', 'AUH', 'AMM', 'TLV', 'IST',

  // Canada
  'YTO', 'YVR', 'YUL', 'YYC', 'YOW'
]

async function fetchCityData(iataCode: string, amadeus: Amadeus): Promise<City | null> {
  try {
    const response = await amadeus.referenceData.locations.get({
      keyword: iataCode,
      subType: 'CITY'
    })

    if (response.data && response.data.length > 0) {
      const city = response.data[0]
      return {
        name: city.address.cityName,
        iataCode: city.iataCode,
        latitude: city.geoCode.latitude,
        longitude: city.geoCode.longitude,
        countryCode: city.address.countryCode
      }
    }

    return null
  } catch (error) {
    console.error(`Error fetching ${iataCode}:`, error)
    return null
  }
}

async function main() {
  console.log('Fetching city data from Amadeus API...')
  console.log(`Total cities to fetch: ${POPULAR_CITY_CODES.length}`)

  // Initialize Amadeus client
  const amadeus = new Amadeus({
    clientId: process.env.AMADEUS_API_KEY!,
    clientSecret: process.env.AMADEUS_API_SECRET!,
    hostname: process.env.AMADEUS_ENVIRONMENT === 'production' ? 'production' : 'test'
  })

  const cities: City[] = []
  const batchSize = 5 // Process 5 cities at a time to avoid rate limits

  for (let i = 0; i < POPULAR_CITY_CODES.length; i += batchSize) {
    const batch = POPULAR_CITY_CODES.slice(i, i + batchSize)
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(POPULAR_CITY_CODES.length / batchSize)}...`)

    const results = await Promise.all(
      batch.map(code => fetchCityData(code, amadeus))
    )

    cities.push(...results.filter((city): city is City => city !== null))

    // Wait 1 second between batches to respect rate limits
    if (i + batchSize < POPULAR_CITY_CODES.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  // Sort cities alphabetically by name
  cities.sort((a, b) => a.name.localeCompare(b.name))

  console.log(`\nSuccessfully fetched ${cities.length} cities`)

  // Write to TypeScript file
  const outputPath = path.join(process.cwd(), 'lib', 'data', 'cities.ts')
  const content = `/**
 * Static city database
 * Generated on: ${new Date().toISOString()}
 * Total cities: ${cities.length}
 *
 * This file is auto-generated. Do not edit manually.
 * To update, run: npx tsx scripts/fetch-cities.ts
 */

export interface City {
  name: string
  iataCode: string
  latitude: number
  longitude: number
  countryCode: string
}

export const CITIES: City[] = ${JSON.stringify(cities, null, 2)}

/**
 * Search cities by name (case-insensitive)
 */
export function searchCities(query: string, limit: number = 10): City[] {
  const normalizedQuery = query.toLowerCase().trim()

  if (!normalizedQuery) return []

  return CITIES
    .filter(city =>
      city.name.toLowerCase().includes(normalizedQuery) ||
      city.iataCode.toLowerCase().includes(normalizedQuery)
    )
    .slice(0, limit)
}

/**
 * Get city by IATA code
 */
export function getCityByCode(iataCode: string): City | undefined {
  return CITIES.find(city =>
    city.iataCode.toUpperCase() === iataCode.toUpperCase()
  )
}
`

  // Create lib/data directory if it doesn't exist
  const dir = path.dirname(outputPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  fs.writeFileSync(outputPath, content)
  console.log(`\nWritten to: ${outputPath}`)
  console.log('\nDone! ✅')
}

main().catch(console.error)
