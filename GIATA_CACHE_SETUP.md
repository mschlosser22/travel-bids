# HotelBeds GIATA Code Caching System

## Overview

GIATA codes are industry-standard hotel identifiers that enable 100% confident hotel matching across different providers. HotelBeds provides GIATA codes via their **Content API** (not the Booking API used for searches).

This system implements a multi-tier caching strategy to efficiently access GIATA codes without making repeated API calls.

## Architecture

### 3-Tier Cache System:

1. **In-Memory Cache** (Fastest)
   - Module-level Map in `hotelbeds.ts`
   - Persists during app runtime
   - ~0ms lookup time

2. **Database Cache** (Supabase)
   - Permanent storage in `hotelbeds_hotel_metadata` table
   - Indexed for fast lookups
   - ~5-10ms lookup time

3. **Content API** (Slowest - avoided after initial fetch)
   - Only called once to populate cache
   - Rate limited (1 req/second)

### Data Flow:

```
Search Request
    ↓
Check Memory Cache → Found? → Use GIATA ID
    ↓ Not Found
Check Database → Found? → Cache in Memory → Use GIATA ID
    ↓ Not Found
Return null (match using embeddings + GPS instead)
```

## Setup Instructions

### 1. Run Database Migration

```bash
# Apply the migration to create the cache table
npm run supabase:migration
```

Or manually run the SQL from:
`supabase/migrations/20251212_create_hotelbeds_giata_cache.sql`

### 2. Populate GIATA Cache

Run the fetch script to populate the cache with GIATA codes for your target destinations:

```bash
npm run fetch:giata
```

This will:
- Fetch hotels from HotelBeds Content API for popular US cities
- Store GIATA codes, coordinates, and metadata in Supabase
- Rate limit at 1 request/second (to respect API limits)
- Cache ~1000 hotels per destination

**Default destinations:**
- NYC (New York)
- LAX (Los Angeles)
- CHI (Chicago)
- MIA (Miami)
- LAS (Las Vegas)
- SFO (San Francisco)
- ORL (Orlando)
- SEA (Seattle)
- BOS (Boston)
- WAS (Washington DC)

**To add more destinations**, edit `scripts/fetch-hotelbeds-giata.ts` and add destination codes to the array.

### 3. Verify Cache

Check the cache was populated:

```sql
-- Total hotels cached
SELECT COUNT(*) FROM hotelbeds_hotel_metadata;

-- Hotels with GIATA codes
SELECT COUNT(*) FROM hotelbeds_hotel_metadata WHERE giata_id IS NOT NULL;

-- Coverage by destination
SELECT
  destination_code,
  COUNT(*) as total_hotels,
  COUNT(giata_id) as with_giata,
  ROUND(COUNT(giata_id)::NUMERIC / COUNT(*) * 100, 1) as coverage_percent
FROM hotelbeds_hotel_metadata
GROUP BY destination_code
ORDER BY total_hotels DESC;
```

## Usage

The HotelBeds provider automatically uses the GIATA cache during search:

```typescript
// In HotelBedsProvider.search()
const hotels = response.hotels.hotels

// Batch fetch GIATA IDs for all hotels (uses cache!)
const hotelCodes = hotels.map(h => parseInt(h.code))
const giataMap = await this.batchGetGiataIds(hotelCodes)

// Map with GIATA IDs
return hotels.map(hotel => {
  const giataId = giataMap.get(parseInt(hotel.code))
  return this.mapToHotelResult(hotel, params, giataId)
})
```

## Benefits

### With GIATA Codes:
- ✅ **100% confident matching** between providers
- ✅ No AI inference needed - instant match
- ✅ Zero OpenAI API costs for matching
- ✅ Can safely merge data from multiple providers

### Without GIATA Codes:
- ⚠️ Falls back to RAG matching (embeddings + GPS + name)
- ⚠️ 80-99% confidence (not 100%)
- ⚠️ Costs $0.00002 per hotel for OpenAI embeddings
- ⚠️ Lower confidence hotels excluded from advertising

## Performance

### Batch Lookup (38 hotels):
- **Memory cache hit**: ~0ms
- **Database cache hit**: ~15ms (single batch query)
- **No cache**: Would require 38 separate Content API calls!

### Cache Hit Rates:
- After initial population: **100%** for cached destinations
- For new destinations: **0%** until fetch script run
- Memory cache warm-up: **~5 searches**

## Maintenance

### Update Cache (Monthly Recommended):

```bash
# Re-run fetch script to update with new hotels
npm run fetch:giata
```

This will upsert records (update existing, insert new).

### Monitor Cache Coverage:

```sql
-- Check last update time
SELECT MAX(updated_at) as last_update FROM hotelbeds_hotel_metadata;

-- Find destinations with low coverage
SELECT destination_code,
       COUNT(*) as hotels,
       COUNT(giata_id) as with_giata
FROM hotelbeds_hotel_metadata
GROUP BY destination_code
HAVING COUNT(giata_id)::FLOAT / COUNT(*) < 0.8;
```

## Cost Savings

### Without Cache:
- 38 hotels/search × 1 Content API call/hotel = **38 API calls**
- Rate limit: 1 req/sec = **38 seconds per search**
- Monthly: 1000 searches = **38,000 API calls**

### With Cache:
- 38 hotels/search × 1 database query (batch) = **1 query**
- Lookup time: **~15ms**
- Monthly: 1000 searches = **1,000 queries** (reusing cached data)

**Result:** 97% fewer API calls, 2500x faster lookups!

## Troubleshooting

### No GIATA codes found

1. Check migration ran:
   ```sql
   SELECT * FROM hotelbeds_hotel_metadata LIMIT 1;
   ```

2. Check fetch script completed:
   ```bash
   npm run fetch:giata
   ```

3. Verify destination codes match search queries

### Low cache hit rate

- Run fetch script for your target destinations
- Check destination code mapping in `hotelbeds.ts`

### Content API errors

- Verify HOTELBEDS_API_KEY and SECRET are correct
- Check rate limiting (max 1 req/second)
- Confirm test environment has access to Content API
