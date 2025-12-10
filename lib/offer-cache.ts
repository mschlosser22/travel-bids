// Vercel KV integration with local fallback for development
// In production, environment variables will be auto-configured by Vercel KV

// In-memory cache for local development
const memoryCache = new Map<string, { value: string; expiresAt: number }>()

const fallbackKv = {
  async setex(key: string, ttl: number, value: string) {
    memoryCache.set(key, {
      value,
      expiresAt: Date.now() + (ttl * 1000)
    })
  },
  async get(key: string) {
    const cached = memoryCache.get(key)
    if (!cached) return null
    if (Date.now() > cached.expiresAt) {
      memoryCache.delete(key)
      return null
    }
    return cached.value
  },
  async del(key: string) {
    memoryCache.delete(key)
  }
}

let kv: any

// Check if Vercel KV is configured (environment variables present)
const isVercelKvConfigured = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN

if (isVercelKvConfigured) {
  // Use real Vercel KV in production
  try {
    const vercelKv = require('@vercel/kv')
    kv = vercelKv.kv
    console.log('[offer-cache] Using Vercel KV')
  } catch (error) {
    console.warn('[offer-cache] Vercel KV import failed, using fallback:', error)
    kv = fallbackKv
  }
} else {
  // Use in-memory fallback for local development
  console.warn('[offer-cache] Vercel KV not configured (missing environment variables), using in-memory fallback')
  kv = fallbackKv
}

const CACHE_TTL = 900 // 15 minutes in seconds
const CACHE_PREFIX = 'offer'

export interface CachedOffer {
  providerId: string
  providerHotelId: string
  room: {
    roomId: string
    roomType: string
    description?: string
    bedType?: string
    maxOccupancy?: number
    price: number
    currency: string
  }
  checkInDate: string
  checkOutDate: string
  adults: number
  rooms: number
  hotelName: string
  hotelAddress: string
  cachedAt: number
  expiresAt: number
}

/**
 * Cache a hotel offer (room + pricing) for use in booking flow
 * Solves the ephemeral offer ID problem where providers generate new IDs on each API call
 *
 * @returns Cache key to be passed in booking URL
 */
export async function cacheOffer(
  providerId: string,
  providerHotelId: string,
  room: any,
  searchParams: {
    checkInDate: string
    checkOutDate: string
    adults: number
    rooms: number
  },
  hotelInfo: {
    name: string
    address: string
  }
): Promise<string> {
  const timestamp = Date.now()
  const cacheKey = `${CACHE_PREFIX}:${providerId}:${providerHotelId}:${room.roomId}:${timestamp}`

  const offerData: CachedOffer = {
    providerId,
    providerHotelId,
    room: {
      roomId: room.roomId,
      roomType: room.roomType,
      description: room.description,
      bedType: room.bedType,
      maxOccupancy: room.maxOccupancy,
      price: room.price,
      currency: room.currency || 'USD'
    },
    checkInDate: searchParams.checkInDate,
    checkOutDate: searchParams.checkOutDate,
    adults: searchParams.adults,
    rooms: searchParams.rooms,
    hotelName: hotelInfo.name,
    hotelAddress: hotelInfo.address,
    cachedAt: timestamp,
    expiresAt: timestamp + (CACHE_TTL * 1000)
  }

  // Vercel KV stores objects directly, fallback needs string
  if (isVercelKvConfigured) {
    await kv.setex(cacheKey, CACHE_TTL, offerData)
  } else {
    await kv.setex(cacheKey, CACHE_TTL, JSON.stringify(offerData))
  }

  return cacheKey
}

/**
 * Retrieve a cached offer by its cache key
 *
 * @returns CachedOffer if found and not expired, null otherwise
 */
export async function getCachedOffer(cacheKey: string): Promise<CachedOffer | null> {
  try {
    const data = await kv.get(cacheKey)
    if (!data) {
      console.log('[offer-cache] Cache miss - key not found:', cacheKey)
      return null
    }

    // Handle both string (fallback) and object (Vercel KV) responses
    const offer = typeof data === 'string' ? JSON.parse(data) : data as CachedOffer

    // Verify not expired (belt-and-suspenders check)
    if (Date.now() > offer.expiresAt) {
      console.log('[offer-cache] Cache expired:', cacheKey)
      await kv.del(cacheKey) // Clean up
      return null
    }

    console.log('[offer-cache] Cache hit:', cacheKey)
    return offer
  } catch (error) {
    console.error('[offer-cache] Error retrieving cached offer:', error)
    return null
  }
}

/**
 * Delete a cached offer (e.g., after successful booking)
 */
export async function deleteCachedOffer(cacheKey: string): Promise<void> {
  try {
    await kv.del(cacheKey)
    console.log('[offer-cache] Deleted cache key:', cacheKey)
  } catch (error) {
    console.error('[offer-cache] Error deleting cached offer:', error)
  }
}

/**
 * Get cache statistics (for monitoring)
 */
export async function getCacheStats() {
  // TODO: Implement cache hit/miss rate tracking if needed
  return {
    // Could use a separate key to track hit/miss counts
    // For now, rely on PostHog events for monitoring
  }
}
