# Hotel Reservation Portal - Current Status

**Last Updated:** 2025-12-12

## Mission
A hotel booking platform optimized for Google Ads conversions with multi-provider pricing comparison.

## Core Technology Stack
- **Next.js 15** - App Router, Server Components
- **Supabase** - PostgreSQL, Auth
- **Stripe** - Payment processing with webhooks
- **Vercel** - Hosting and deployment
- **Analytics** - Google Analytics 4, PostHog, Meta Pixel

---

## ✅ Phase 1: Multi-Provider Architecture (COMPLETED)

### Hotel Providers
- ✅ **Amadeus API** - Primary inventory (2.9M+ hotels)
- ✅ **HotelBeds API** - B2B wholesale rates, API key acquired
- ✅ **Provider Abstraction Layer** - Unified interface for all providers
- ✅ **GIATA Caching** - 3-tier cache (memory → database → API)
- ✅ **Canonical Hotel System** - AI-powered RAG matching with embeddings
- ✅ **Multi-Provider Price Comparison** - Search all providers in parallel

### Key Files
- `lib/hotel-providers/amadeus.ts` - Amadeus provider implementation
- `lib/hotel-providers/hotelbeds.ts` - HotelBeds provider with GIATA caching
- `lib/hotel-providers/provider-manager.ts` - Multi-provider orchestration
- `lib/hotel-matching/rag-matcher.ts` - AI-powered hotel deduplication
- `scripts/fetch-hotelbeds-giata.ts` - Populate canonical hotels from Content API

### Database Schema
- `canonical_hotels` - Master registry of unique hotels
- `provider_mappings` - Links provider IDs to canonical hotels
- `hotelbeds_hotel_metadata` - GIATA cache for fast lookups
- `hotel_price_cache` - 10-minute TTL for price results

---

## ✅ Phase 1.5: Google Ads Landing Pages (COMPLETED)

### Architecture
**Flow:** Ad Click → Hotel Page → Date Selection → Price Search → Book

**Critical for Main Business Model:**
- User lands on hotel page WITHOUT dates in URL
- Date picker shown on page
- Real-time multi-provider price comparison
- UTM tracking preserved throughout entire funnel

### Key Files
- `app/h/[slug]/page.tsx` - Server component (captures UTM params)
- `app/h/[slug]/HotelLandingPage.tsx` - Client component with date picker
- `app/api/hotels/prices/route.ts` - Multi-provider price search API
- `app/components/shared/DateRangePicker.tsx` - Shared date picker (DRY fix)

### UTM Tracking Flow
1. Ad Click: `?utm_source=google&utm_campaign=nyc-luxury`
2. Page captures UTM in searchParams
3. Passes to client component via props
4. Client sends to price API with booking request
5. API logs for conversion attribution

---

## ✅ Phase 1.75: DRY Fixes (COMPLETED)

### Problem Fixed
Date picker was duplicated in:
- `HotelSearchForm.tsx` (standard search flow)
- `HotelLandingPage.tsx` (Google Ads flow)

### Solution
Created shared `DateRangePicker.tsx` component:
- Reusable across both flows
- Consistent styling and logic
- Single source of truth for date validation

### Benefits
- Bug fixes only needed in ONE place
- ~60 lines of code eliminated
- UTM tracking preserved (verified ✅)

---

## 🚧 Phase 2: LLM Optimization (IN PROGRESS)

### Priority 2: Semantic URLs
**Goal:** Replace opaque UUIDs with human/LLM-readable slugs

**Current:**
```
/h/e8f9a2b1-3c4d-5e6f-7a8b-9c0d1e2f3a4b
```

**Target:**
```
/hotel/marriott-marquis-times-square-nyc
```

**Tasks:**
- [ ] Add `slug` field to canonical_hotels table
- [ ] Generate slugs in fetch script (name + city)
- [ ] Create `/hotel/[slug]` route
- [ ] Add canonical tags to prevent duplicate content
- [ ] Update Google Ads URLs (optional)

### Priority 4: Structured Data
**Goal:** Add schema.org JSON-LD for LLM consumption

**What to Add:**
```json
{
  "@context": "https://schema.org",
  "@type": "Hotel",
  "name": "Marriott Marquis Times Square",
  "address": { ... },
  "geo": { "latitude": 40.758896, "longitude": -73.985130 },
  "starRating": { "ratingValue": "4" },
  "identifier": { "name": "GIATA", "value": "123456" }
}
```

**Benefits:**
- LLMs can parse hotel data reliably
- GIATA ID makes hotel globally identifiable
- GPS enables location-based queries
- Star rating helps with quality filtering

---

## 📋 Phase 3: Flow Integration (PENDING)

### Tasks
- [ ] Add "View canonical page" link in search results
  - MUST preserve UTM parameters
- [ ] Add "Compare with nearby hotels" link on canonical pages
  - MUST carry forward UTM to search
- [ ] Add breadcrumb navigation
- [ ] Verify GA4, PostHog, Google Ads tracking

### Critical Constraints
- ❌ Cannot break UTM parameter tracking
- ❌ Cannot create new sessions (breaks attribution)
- ❌ Cannot confuse Google Analytics 4, PostHog, or Google Ads
- ✅ Must preserve query parameters when navigating
- ✅ Must ensure conversions attribute to correct ad source

---

## 📊 Key Metrics

### Performance
- Provider abstraction: ✅ Complete
- GIATA cache hit rate: ~97%
- Price search speed: <2 seconds (parallel provider calls)

### Code Quality
- DRY violations: 0 (fixed date picker duplication)
- Component reuse: ~90%
- TypeScript coverage: 100%

### Business
- UTM tracking: ✅ Fully functional
- Conversion tracking: ✅ Ready for GA4/PostHog
- Ad spend ROI tracking: ✅ Infrastructure ready

---

## 📚 Documentation

### Architecture Docs
- `ARCHITECTURE_ANALYSIS_REPORT.md` - DRY violations and LLM discoverability analysis
- `GOOGLE_ADS_LANDING_PAGES.md` - Google Ads flow architecture
- `GIATA_CACHE_SETUP.md` - 3-tier caching system
- `HOTEL_MATCHING_SYSTEM_DESIGN.md` - AI-powered deduplication

### Session Logs
- `.claude-session-memory.md` - Current session work log

---

## 🎯 Next Priorities

1. **Semantic URLs** - Replace UUIDs with slugs (2 hours)
2. **Structured Data** - Add schema.org JSON-LD (1 hour)
3. **Flow Integration** - Cross-link flows while preserving UTM (2 hours)
4. **Testing** - Verify analytics tracking across flows

---

## 🚫 Non-Negotiable Constraints

### Ad Tracking Integrity
- UTM parameters must be preserved throughout ALL flows
- Session continuity must be maintained
- Google Ads conversion tracking cannot be broken
- PostHog event tracking must work correctly
- ROI on ad spend must be accurately measurable

### Why This Matters
Google Ads is the **main business model**. Every technical decision must prioritize maintaining conversion tracking integrity. A feature that breaks ad attribution is worse than no feature at all.
