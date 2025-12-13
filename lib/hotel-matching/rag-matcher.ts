// RAG-based Hotel Matching Service
// Uses OpenAI embeddings + hybrid scoring for multi-provider hotel deduplication

import OpenAI from 'openai'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { HotelResult } from '../hotel-providers/types'

// Create Supabase client (works in both Next.js and scripts)
function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export interface MatchResult {
  canonicalId: string | null
  confidence: number
  method: 'cache' | 'rag' | 'gps' | 'no_match'
  shouldAdvertise: boolean
  metadata?: {
    embeddingScore?: number
    locationScore?: number
    nameScore?: number
    candidates?: number
  }
}

/**
 * Match a hotel from a provider to canonical hotel database
 * Uses multi-stage approach: cache -> RAG -> GPS fallback
 */
export async function matchHotel(hotel: HotelResult): Promise<MatchResult> {
  // Stage 1: Check cache (instant lookup)
  const cached = await checkCache(hotel)
  if (cached) return cached

  // Stage 2: Generate embedding & search (RAG)
  const ragResult = await ragMatch(hotel)
  if (ragResult.confidence >= 0.80) {
    // Cache the result
    await cacheMapping(hotel, ragResult)
    return ragResult
  }

  // Stage 3: GPS + name fallback (no embeddings)
  const gpsResult = await gpsMatch(hotel)
  if (gpsResult.confidence >= 0.95) {
    await cacheMapping(hotel, gpsResult)
    return gpsResult
  }

  // No confident match - this hotel stays standalone
  return {
    canonicalId: null,
    confidence: 0,
    method: 'no_match',
    shouldAdvertise: false
  }
}

/**
 * Check provider mapping cache (O(1) lookup)
 */
async function checkCache(hotel: HotelResult): Promise<MatchResult | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('provider_mappings')
    .select('canonical_hotel_id, match_confidence, include_in_ads')
    .eq('provider_id', hotel.providerId)
    .eq('provider_hotel_id', hotel.providerHotelId)
    .single()

  if (!data) return null

  return {
    canonicalId: data.canonical_hotel_id,
    confidence: data.match_confidence,
    method: 'cache',
    shouldAdvertise: data.include_in_ads
  }
}

/**
 * RAG matching: Use embeddings to find similar hotels
 */
async function ragMatch(hotel: HotelResult): Promise<MatchResult> {
  const supabase = createClient()

  // 1. Generate embedding for the hotel
  const embedding = await generateEmbedding(hotel)

  // 2. Find similar hotels using vector search
  const { data: candidates, error } = await supabase.rpc('match_hotels', {
    query_embedding: embedding,
    match_threshold: 0.70, // Minimum 70% embedding similarity
    match_count: 10
  })

  if (!candidates || candidates.length === 0) {
    return {
      canonicalId: null,
      confidence: 0,
      method: 'no_match',
      shouldAdvertise: false
    }
  }

  // 3. Score each candidate with hybrid approach
  const scored = candidates.map((candidate: any) => {
    const embeddingScore = candidate.similarity
    const locationScore = scoreLocation(hotel, candidate)
    const nameScore = scoreNameSimilarity(hotel.name, candidate.name)

    // Weighted combination
    const totalScore = (
      embeddingScore * 0.40 +
      locationScore * 0.30 +
      nameScore * 0.30
    )

    return {
      ...candidate,
      embeddingScore,
      locationScore,
      nameScore,
      totalScore
    }
  })

  // 4. Get best match
  scored.sort((a: any, b: any) => b.totalScore - a.totalScore)
  const best = scored[0]

  // 5. Determine if we should advertise (strict threshold)
  const shouldAdvertise = best.totalScore >= 0.99

  return {
    canonicalId: best.id,
    confidence: best.totalScore,
    method: 'rag',
    shouldAdvertise,
    metadata: {
      embeddingScore: best.embeddingScore,
      locationScore: best.locationScore,
      nameScore: best.nameScore,
      candidates: candidates.length
    }
  }
}

/**
 * GPS-based matching (fallback when embeddings fail)
 */
async function gpsMatch(hotel: HotelResult): Promise<MatchResult> {
  if (!hotel.latitude || !hotel.longitude) {
    return {
      canonicalId: null,
      confidence: 0,
      method: 'no_match',
      shouldAdvertise: false
    }
  }

  const supabase = createClient()

  // Find hotels within 500m radius
  const { data: candidates } = await supabase.rpc('find_nearby_hotels', {
    query_lat: hotel.latitude,
    query_lng: hotel.longitude,
    radius_km: 0.5,
    limit_count: 10
  })

  if (!candidates || candidates.length === 0) {
    return {
      canonicalId: null,
      confidence: 0,
      method: 'no_match',
      shouldAdvertise: false
    }
  }

  // Score by name similarity only (no embeddings)
  const scored = candidates.map((candidate: any) => {
    const nameScore = scoreNameSimilarity(hotel.name, candidate.name)
    const distance = calculateDistance(
      hotel.latitude!, hotel.longitude!,
      candidate.latitude, candidate.longitude
    )

    // Within 100m + exact name = very confident
    const locationBonus = distance < 0.1 ? 0.2 : 0
    const totalScore = nameScore + locationBonus

    return {
      ...candidate,
      nameScore,
      distance,
      totalScore
    }
  })

  scored.sort((a: any, b: any) => b.totalScore - a.totalScore)
  const best = scored[0]

  // High threshold for GPS-only matching
  const shouldAdvertise = best.totalScore >= 0.98

  return {
    canonicalId: best.id,
    confidence: best.totalScore,
    method: 'gps',
    shouldAdvertise,
    metadata: {
      nameScore: best.nameScore,
      candidates: candidates.length
    }
  }
}

/**
 * Generate embedding for hotel using OpenAI
 */
async function generateEmbedding(hotel: HotelResult): Promise<number[]> {
  // Combine relevant fields into searchable text
  const text = [
    hotel.name,
    hotel.address,
    hotel.city,
    hotel.state || '',
    hotel.country
  ].filter(Boolean).join(', ')

  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
      dimensions: 1536 // Standard dimension for pgvector
    })

    return response.data[0].embedding
  } catch (error) {
    console.error('Error generating embedding:', error)
    throw error
  }
}

/**
 * Score location similarity (GPS distance)
 */
function scoreLocation(hotel: HotelResult, candidate: any): number {
  if (!hotel.latitude || !hotel.longitude) return 0.5 // Default mid-score

  const distance = calculateDistance(
    hotel.latitude,
    hotel.longitude,
    candidate.latitude,
    candidate.longitude
  )

  // Distance-based scoring
  if (distance < 0.05) return 1.0  // < 50m = same building
  if (distance < 0.1) return 0.95  // < 100m = very close
  if (distance < 0.5) return 0.75  // < 500m = nearby
  if (distance < 1.0) return 0.5   // < 1km = same area
  return 0.0 // > 1km = different hotel
}

/**
 * Score name similarity using Jaro-Winkler distance
 */
function scoreNameSimilarity(name1: string, name2: string): number {
  const n1 = normalizeName(name1)
  const n2 = normalizeName(name2)

  // Exact match
  if (n1 === n2) return 1.0

  // Jaro-Winkler similarity
  return jaroWinkler(n1, n2)
}

/**
 * Normalize hotel name for comparison
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .replace(/\s+/g, ' ')         // Collapse whitespace
    .trim()
}

/**
 * Calculate distance between two GPS coordinates (in km)
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371 // Earth radius in km
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/**
 * Jaro-Winkler string similarity (0.0 to 1.0)
 */
function jaroWinkler(s1: string, s2: string): number {
  const m = Math.max(s1.length, s2.length)
  if (m === 0) return 1.0

  const matchWindow = Math.floor(Math.max(s1.length, s2.length) / 2) - 1
  const s1Matches = new Array(s1.length).fill(false)
  const s2Matches = new Array(s2.length).fill(false)

  let matches = 0
  let transpositions = 0

  // Find matches
  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchWindow)
    const end = Math.min(i + matchWindow + 1, s2.length)

    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue
      s1Matches[i] = true
      s2Matches[j] = true
      matches++
      break
    }
  }

  if (matches === 0) return 0.0

  // Count transpositions
  let k = 0
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue
    while (!s2Matches[k]) k++
    if (s1[i] !== s2[k]) transpositions++
    k++
  }

  const jaro =
    (matches / s1.length +
      matches / s2.length +
      (matches - transpositions / 2) / matches) /
    3

  // Winkler modification (boost for common prefix)
  const prefixLength = Math.min(4, commonPrefixLength(s1, s2))
  return jaro + prefixLength * 0.1 * (1 - jaro)
}

function commonPrefixLength(s1: string, s2: string): number {
  const n = Math.min(s1.length, s2.length)
  for (let i = 0; i < n; i++) {
    if (s1[i] !== s2[i]) return i
  }
  return n
}

/**
 * Cache mapping for faster future lookups
 */
async function cacheMapping(
  hotel: HotelResult,
  match: MatchResult
): Promise<void> {
  if (!match.canonicalId) return

  const supabase = createClient()

  await supabase.from('provider_mappings').upsert({
    canonical_hotel_id: match.canonicalId,
    provider_id: hotel.providerId,
    provider_hotel_id: hotel.providerHotelId,
    match_confidence: match.confidence,
    match_method: match.method,
    include_in_ads: match.shouldAdvertise
  }, {
    onConflict: 'provider_id,provider_hotel_id'
  })
}

/**
 * Create new canonical hotel (when no match found)
 */
export async function createCanonicalHotel(
  hotel: HotelResult
): Promise<string> {
  const supabase = createClient()
  const embedding = await generateEmbedding(hotel)

  const { data, error } = await supabase
    .from('canonical_hotels')
    .insert({
      name: hotel.name,
      normalized_name: normalizeName(hotel.name),
      latitude: hotel.latitude,
      longitude: hotel.longitude,
      city: hotel.city,
      country: hotel.country,
      name_embedding: embedding,
      description: hotel.description,
      images: hotel.images,
      amenities: hotel.amenities,
      match_confidence: 1.0,
      provider_count: 1
    })
    .select('id')
    .single()

  if (error) throw error

  // Create provider mapping
  await supabase.from('provider_mappings').insert({
    canonical_hotel_id: data.id,
    provider_id: hotel.providerId,
    provider_hotel_id: hotel.providerHotelId,
    match_confidence: 1.0,
    match_method: 'initial',
    include_in_ads: true // First provider is trusted
  })

  return data.id
}
