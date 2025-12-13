# Google Ads Landing Pages - Canonical Hotel Architecture

## Overview

This system implements Google Ads-optimized landing pages for individual hotels. The flow allows users to land on a hotel page FIRST, then select dates and search for prices across multiple providers.

**Flow:**
```
Google Ad Click → Hotel Landing Page (/h/[id]) → User Selects Dates → Real-time Price Search → Book
```

This is different from the old flow which required dates in the URL.

## Architecture

### 1. Canonical Hotels Table

Hotels are stored in `canonical_hotels` table with:
- **Unique ID**: Used for landing page URL
- **GIATA ID**: Industry-standard identifier for 100% confident matching
- **Rich Content**: Description, images, amenities (from Content API)
- **SEO/LLM Optimized**: Name embeddings for semantic search
- **Ad Approval**: `ad_approved` flag (only true for hotels with GIATA ID)

### 2. Provider Mappings

The `provider_mappings` table links canonical hotels to provider-specific IDs:
- **HotelBeds Code** → Canonical Hotel ID
- **Amadeus Code** → Canonical Hotel ID
- **Future Providers** → Canonical Hotel ID

This enables multi-provider price comparison for a single canonical hotel.

### 3. Landing Page Route

**Route:** `/h/[slug]` where slug is the canonical hotel ID

**Key Features:**
- ✅ No dates required in URL
- ✅ SEO-optimized metadata (title, description, Open Graph)
- ✅ LLM-optimized footer (includes GIATA ID, provider count)
- ✅ UTM tracking for Google Ads performance
- ✅ Only shows `ad_approved=true` hotels

**File:** `app/h/[slug]/page.tsx`

### 4. Date Picker Widget

**Component:** `app/h/[slug]/HotelLandingPage.tsx`

**Features:**
- Check-in/Check-out date selection
- Adults and rooms inputs
- Real-time price search button
- Price comparison display
- Responsive design
- Sticky booking widget (desktop)

### 5. Real-Time Price Search API

**Endpoint:** `POST /api/hotels/prices`

**How It Works:**
1. Accepts canonical hotel ID + dates
2. Looks up all provider mappings for that hotel
3. Searches ALL mapped providers in parallel
4. Finds matching hotel in each provider's results
5. Compares prices and returns sorted list
6. Caches results for 10 minutes

**Request:**
```json
{
  "canonicalHotelId": "uuid",
  "checkIn": "2025-01-15",
  "checkOut": "2025-01-17",
  "adults": 2,
  "rooms": 1,
  "utmSource": "google",
  "utmCampaign": "nyc-hotels"
}
```

**Response:**
```json
{
  "prices": [
    {
      "provider": "hotelbeds",
      "price": 159.25,
      "pricePerNight": 79.63,
      "currency": "USD",
      "available": true,
      "roomsAvailable": 5
    },
    {
      "provider": "amadeus",
      "price": 172.50,
      "pricePerNight": 86.25,
      "currency": "USD",
      "available": true,
      "roomsAvailable": 3
    }
  ],
  "lowestPrice": 159.25,
  "lowestProvider": "hotelbeds",
  "cached": false,
  "searchedProviders": 2,
  "resultsFound": 2
}
```

## Populating Canonical Hotels

### Initial Setup

Run the enhanced GIATA fetch script to populate both caches:

```bash
npm run fetch:giata
```

This will:
1. **Fetch from HotelBeds Content API** for 10 major cities
2. **Save to `hotelbeds_hotel_metadata`** (GIATA cache for fast lookups)
3. **Create `canonical_hotels` records** with rich content:
   - Name, description, images, amenities
   - GIATA ID (for 100% confident matching)
   - Embeddings (for semantic search)
   - GPS coordinates
   - Star rating
4. **Create `provider_mappings`** linking HotelBeds codes to canonical IDs
5. **Set `ad_approved=true`** only for hotels with GIATA IDs

**Destinations Fetched:**
- NYC, LAX, CHI, MIA, LAS, SFO, ORL, SEA, BOS, WAS

**Expected Results:**
- ~1000 hotels per destination = ~10,000 canonical hotels
- ~80-90% will have GIATA IDs (ad-approved)

### Adding More Destinations

Edit `scripts/fetch-hotelbeds-giata.ts` and add destination codes:

```typescript
const destinations = [
  'NYC', 'LAX', 'CHI', 'MIA', 'LAS', 'SFO', 'ORL', 'SEA', 'BOS', 'WAS',
  'ATL', 'PHX', 'PHI', 'SAN', 'DAL', 'HOU', 'DEN', 'DET', 'MIN', 'TAM'
]
```

Then run:
```bash
npm run fetch:giata
```

## Google Ads Setup

### 1. Hotel Ads Feed

Create a feed of all ad-approved hotels:

```sql
SELECT
  id as hotel_id,
  name as hotel_name,
  city,
  state,
  country,
  latitude,
  longitude,
  giata_id,
  star_rating,
  CONCAT('https://yourdomain.com/h/', id) as landing_page_url
FROM canonical_hotels
WHERE ad_approved = true
ORDER BY provider_count DESC;  -- Hotels with more providers = more competitive pricing
```

Export this as CSV/XML for Google Hotel Ads feed.

### 2. Dynamic Ad URLs

Your Google Ads should link to:
```
https://yourdomain.com/h/{canonical_hotel_id}?utm_source=google&utm_campaign={campaign_name}&utm_medium=cpc
```

### 3. Tracking Performance

UTM parameters are captured and can be used to:
- Track which ads drive bookings
- Calculate ROAS by campaign
- A/B test ad copy
- Optimize bids by hotel/location

## Benefits of This Architecture

### 1. SEO/LLM Optimized
- ✅ Clean URLs: `/h/{id}` not `/hotel/city/slug/id?dates=...`
- ✅ No dates in URL = indexable pages
- ✅ Rich metadata for search engines
- ✅ GIATA ID in footer for LLM discovery
- ✅ Structured data ready for schema.org markup

### 2. Multi-Provider Price Comparison
- ✅ Shows ALL available providers for each hotel
- ✅ Users see cheapest option immediately
- ✅ Builds trust (transparent pricing)
- ✅ Higher conversion (best price guaranteed)

### 3. GIATA Confidence
- ✅ 100% confident hotel matching (not 80-99%)
- ✅ Safe for Google Ads (no wrong hotel bookings)
- ✅ Can merge data from multiple providers safely
- ✅ Zero OpenAI costs for matching

### 4. Performance
- ✅ Price cache (10 min TTL)
- ✅ GIATA cache (permanent)
- ✅ Parallel provider searches
- ✅ Fast page loads (server-side rendering)

### 5. Analytics Ready
- ✅ UTM tracking built-in
- ✅ Track ad performance by hotel
- ✅ Measure conversion by provider
- ✅ A/B test landing pages

## Example Landing Page

**URL:**
```
https://yourdomain.com/h/e8f9a2b1-3c4d-5e6f-7a8b-9c0d1e2f3a4b?utm_source=google&utm_campaign=nyc-luxury
```

**Page Contains:**
- Hotel name, location, stars
- Description
- Main image + gallery
- Amenities grid
- Date picker (check-in, check-out)
- Guest inputs (adults, rooms)
- "Search Availability" button
- Real-time price comparison results
- "Book Now" buttons for each provider

**User Experience:**
1. User clicks Google Ad for "Marriott NYC"
2. Lands on landing page (no dates required!)
3. Sees hotel photos, description, amenities
4. Selects dates: Jan 15-17, 2025
5. Clicks "Search Availability & Prices"
6. Sees prices from HotelBeds ($159) and Amadeus ($172)
7. Clicks "Book Now" on cheapest option
8. Proceeds to booking flow

## Price Cache Strategy

### Cache Keys
```
canonical_hotel_id + check_in + check_out + adults + rooms
```

### Cache Behavior
- **TTL:** 10 minutes
- **Storage:** `hotel_price_cache` table
- **Invalidation:** Automatic (expires_at)
- **Refresh:** On-demand when user searches

### Why 10 Minutes?
- Hotel prices change infrequently during the day
- Reduces API calls by ~600x (10 users/hour = 1 call instead of 600)
- Still fresh enough for accurate pricing
- Balances cost vs. accuracy

## Monitoring

### Key Metrics to Track

1. **Ad-Approved Hotels:**
   ```sql
   SELECT COUNT(*) FROM canonical_hotels WHERE ad_approved = true;
   ```

2. **Provider Coverage:**
   ```sql
   SELECT
     provider_count,
     COUNT(*) as hotels
   FROM canonical_hotels
   WHERE ad_approved = true
   GROUP BY provider_count
   ORDER BY provider_count DESC;
   ```

3. **GIATA Coverage:**
   ```sql
   SELECT
     COUNT(*) as total,
     COUNT(giata_id) as with_giata,
     ROUND(COUNT(giata_id)::NUMERIC / COUNT(*) * 100, 1) as coverage_pct
   FROM canonical_hotels;
   ```

4. **Cache Hit Rate:**
   ```sql
   SELECT
     COUNT(*) as total_searches,
     SUM(CASE WHEN cached_at > NOW() - INTERVAL '5 minutes' THEN 1 ELSE 0 END) as cache_hits,
     ROUND(SUM(CASE WHEN cached_at > NOW() - INTERVAL '5 minutes' THEN 1 ELSE 0 END)::NUMERIC / COUNT(*) * 100, 1) as hit_rate_pct
   FROM hotel_price_cache
   WHERE cached_at > NOW() - INTERVAL '24 hours';
   ```

## Troubleshooting

### No prices returned

1. Check provider mappings exist:
   ```sql
   SELECT * FROM provider_mappings WHERE canonical_hotel_id = 'your-hotel-id';
   ```

2. Check provider credentials in `.env.local`

3. Check API logs for provider errors

### Hotel not showing in ads

1. Verify `ad_approved = true`:
   ```sql
   SELECT ad_approved, giata_id FROM canonical_hotels WHERE id = 'your-hotel-id';
   ```

2. Only hotels with GIATA IDs are ad-approved
3. Run fetch script to get GIATA codes

### Slow price searches

1. Check number of providers:
   ```sql
   SELECT provider_count FROM canonical_hotels WHERE id = 'your-hotel-id';
   ```

2. Providers searched in parallel, but 5+ providers can be slow
3. Check price cache is working (should hit cache on repeat searches)

## Next Steps

1. **Run the fetch script** to populate canonical hotels:
   ```bash
   npm run fetch:giata
   ```

2. **Verify hotels created:**
   ```sql
   SELECT COUNT(*) FROM canonical_hotels WHERE ad_approved = true;
   ```

3. **Test a landing page:**
   - Pick a canonical hotel ID from the database
   - Visit `http://localhost:3000/h/{id}`
   - Select dates and search for prices

4. **Export hotel feed for Google Ads**

5. **Set up Google Ads campaigns** with landing page URLs

6. **Monitor performance** using UTM tracking
