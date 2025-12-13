// Hotel Provider Manager
// Orchestrates multiple hotel providers with caching and failover

import type {
  HotelProvider,
  SearchParams,
  HotelResult,
  HotelDetails,
  AvailabilityParams,
  Availability,
  BookingParams,
  Booking,
  CancellationResult
} from './types'
import { AmadeusProvider } from './amadeus'
import { HotelBedsProvider } from './hotelbeds'

// Simple in-memory cache (in production, use Redis)
interface CacheEntry<T> {
  data: T
  expiresAt: number
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>()

  set<T>(key: string, data: T, ttlMs: number): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  clear(): void {
    this.cache.clear()
  }
}

export class HotelProviderManager {
  private providers: Map<string, HotelProvider> = new Map()
  private cache = new SimpleCache()

  // Cache TTLs
  private readonly SEARCH_CACHE_TTL = 10 * 60 * 1000  // 10 minutes
  private readonly DETAILS_CACHE_TTL = 60 * 60 * 1000 // 1 hour

  constructor() {
    // Register all available providers
    this.registerProvider(new AmadeusProvider())

    // Register HotelBeds if credentials are available
    try {
      this.registerProvider(new HotelBedsProvider())
      console.log('✅ HotelBeds provider registered')
    } catch (error) {
      console.log('⚠️  HotelBeds provider not registered (credentials missing)')
    }
  }

  /**
   * Register a new hotel provider
   */
  registerProvider(provider: HotelProvider): void {
    this.providers.set(provider.name, provider)
  }

  /**
   * Get a specific provider by name
   */
  getProvider(name: string): HotelProvider | undefined {
    return this.providers.get(name)
  }

  /**
   * Search hotels across all providers (or specific provider)
   */
  async search(
    params: SearchParams,
    providerName?: string
  ): Promise<HotelResult[]> {
    // Generate cache key
    const cacheKey = `search:${JSON.stringify(params)}`

    // Check cache first
    const cached = this.cache.get<HotelResult[]>(cacheKey)
    if (cached) {
      console.log('🎯 Cache hit for hotel search')
      return cached
    }

    try {
      let results: HotelResult[] = []

      if (providerName) {
        // Search specific provider
        const provider = this.providers.get(providerName)
        if (!provider) {
          throw new Error(`Provider ${providerName} not found`)
        }
        results = await provider.search(params)
      } else {
        // Search all providers in parallel
        const searchPromises = Array.from(this.providers.values()).map(provider =>
          provider.search(params).catch(error => {
            console.error(`Search failed for ${provider.name}:`, error.message)
            console.error('Full error:', JSON.stringify(error, null, 2))
            return [] // Return empty array on error, don't fail entire search
          })
        )

        const allResults = await Promise.all(searchPromises)
        results = allResults.flat()

        // Sort by price (cheapest first)
        results.sort((a, b) => a.price - b.price)
      }

      // Cache results
      this.cache.set(cacheKey, results, this.SEARCH_CACHE_TTL)

      return results

    } catch (error) {
      console.error('Hotel search error:', error)
      throw error
    }
  }

  /**
   * Get detailed hotel information
   */
  async getDetails(
    providerName: string,
    providerHotelId: string,
    params: SearchParams
  ): Promise<HotelDetails> {
    const cacheKey = `details:${providerName}:${providerHotelId}:${JSON.stringify(params)}`

    // Check cache
    const cached = this.cache.get<HotelDetails>(cacheKey)
    if (cached) {
      console.log('🎯 Cache hit for hotel details')
      return cached
    }

    const provider = this.providers.get(providerName)
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`)
    }

    const details = await provider.getDetails(providerHotelId, params)

    // Cache details
    this.cache.set(cacheKey, details, this.DETAILS_CACHE_TTL)

    return details
  }

  /**
   * Check real-time availability (no caching)
   */
  async checkAvailability(
    providerName: string,
    params: AvailabilityParams
  ): Promise<Availability> {
    const provider = this.providers.get(providerName)
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`)
    }

    return provider.checkAvailability(params)
  }

  /**
   * Create a booking with the specified provider
   */
  async createBooking(
    providerName: string,
    params: BookingParams
  ): Promise<Booking> {
    const provider = this.providers.get(providerName)
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`)
    }

    return provider.createBooking(params)
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(
    providerName: string,
    providerBookingId: string
  ): Promise<CancellationResult> {
    const provider = this.providers.get(providerName)
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`)
    }

    return provider.cancelBooking(providerBookingId)
  }

  /**
   * Get list of all registered providers
   */
  getProviders(): string[] {
    return Array.from(this.providers.keys())
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    this.cache.clear()
  }
}

// Singleton instance
let providerManagerInstance: HotelProviderManager | null = null

export function getProviderManager(): HotelProviderManager {
  if (!providerManagerInstance) {
    providerManagerInstance = new HotelProviderManager()
  }
  return providerManagerInstance
}
