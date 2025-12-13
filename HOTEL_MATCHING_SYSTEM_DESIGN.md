# Hotel Matching System - Design Document

## Overview
AI-powered hotel identity resolution system that matches hotels across multiple providers without relying on third-party services like GIATA.

## Goals
1. **Independence**: No vendor lock-in to GIATA or similar services
2. **Accuracy**: 99%+ matching accuracy for hotel identity
3. **Scalability**: Handle millions of hotels across dozens of providers
4. **Real-time**: Match hotels in <100ms for user-facing searches
5. **Learning**: Continuously improve from corrections and new data

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Search Request                            │
│                 (NYC, 2025-01-15, 2 guests)                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Multi-Provider Aggregator                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Amadeus  │  │ Booking  │  │ Expedia  │  │ Hotels   │   │
│  │   API    │  │   .com   │  │   API    │  │  .com    │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
└───────┼─────────────┼─────────────┼─────────────┼──────────┘
        │             │             │             │
        ▼             ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────┐
│                 Hotel Matching Engine                        │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  1. Extract Features (name, address, coords, etc.)   │  │
│  └────────────────────────┬─────────────────────────────┘  │
│                           ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  2. Check Mapping Cache (provider_id → canonical_id) │  │
│  └────────────────────────┬─────────────────────────────┘  │
│                           ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  3. AI Matching (if not cached)                      │  │
│  │     • Embedding similarity                            │  │
│  │     • GPS distance                                    │  │
│  │     • String matching                                 │  │
│  │     • Confidence scoring                              │  │
│  └────────────────────────┬─────────────────────────────┘  │
│                           ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  4. Merge & Deduplicate                              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Canonical Hotel Database                        │
│                                                              │
│  hotel_id: "hrp_hotel_abc123"                               │
│  name: "Hilton Garden Inn Times Square"                     │
│  location: { lat: 40.758, lng: -73.991 }                   │
│  provider_mappings: [                                        │
│    { provider: "amadeus", id: "NYCTSQ12", confidence: 1.0 } │
│    { provider: "booking", id: "9876543", confidence: 1.0 }  │
│    { provider: "expedia", id: "123456", confidence: 0.98 }  │
│  ]                                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Table: `canonical_hotels`
Stores the master hotel registry with enriched data.

```sql
CREATE TABLE canonical_hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Info
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL, -- lowercase, no special chars
  address JSONB NOT NULL, -- { street, city, state, country, postal_code }

  -- Location (for geo matching)
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  geohash TEXT, -- for spatial indexing

  -- Metadata
  star_rating INTEGER,
  chain_code TEXT,
  property_type TEXT, -- hotel, resort, motel, etc.

  -- Enriched Content (merged from all providers)
  description TEXT,
  images JSONB, -- array of image URLs
  amenities JSONB, -- array of amenities

  -- Matching metadata
  confidence_score DECIMAL(3, 2), -- how confident we are in this record
  last_verified_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Indexes
  INDEX idx_normalized_name (normalized_name),
  INDEX idx_geohash (geohash),
  INDEX idx_location (latitude, longitude)
);
```

### Table: `provider_mappings`
Maps provider hotel IDs to canonical IDs.

```sql
CREATE TABLE provider_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  canonical_hotel_id UUID REFERENCES canonical_hotels(id) ON DELETE CASCADE,

  provider_id TEXT NOT NULL, -- "amadeus", "booking", "expedia"
  provider_hotel_id TEXT NOT NULL, -- provider's internal ID

  -- Matching confidence
  confidence DECIMAL(3, 2) NOT NULL DEFAULT 1.0, -- 0.0 to 1.0
  match_method TEXT NOT NULL, -- "exact_id", "ai_match", "manual", "fuzzy"

  -- Verification
  verified BOOLEAN DEFAULT FALSE,
  verified_by TEXT, -- user_id or "system"
  verified_at TIMESTAMPTZ,

  -- Raw provider data (for re-matching if needed)
  provider_data JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(provider_id, provider_hotel_id),
  INDEX idx_canonical_hotel (canonical_hotel_id),
  INDEX idx_provider_lookup (provider_id, provider_hotel_id)
);
```

### Table: `matching_queue`
Hotels awaiting AI matching or human review.

```sql
CREATE TABLE matching_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  provider_id TEXT NOT NULL,
  provider_hotel_id TEXT NOT NULL,
  provider_data JSONB NOT NULL,

  -- Matching status
  status TEXT NOT NULL DEFAULT 'pending', -- pending, matched, needs_review, rejected

  -- AI matching results
  ai_matches JSONB, -- array of potential matches with scores
  selected_match_id UUID REFERENCES canonical_hotels(id),

  -- Review info
  needs_human_review BOOLEAN DEFAULT FALSE,
  review_reason TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_status (status),
  INDEX idx_needs_review (needs_human_review)
);
```

### Table: `match_corrections`
Manual corrections to improve AI model.

```sql
CREATE TABLE match_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  provider_mapping_id UUID REFERENCES provider_mappings(id),

  old_canonical_id UUID,
  new_canonical_id UUID REFERENCES canonical_hotels(id),

  correction_type TEXT NOT NULL, -- "split", "merge", "wrong_match"
  reason TEXT,

  corrected_by TEXT NOT NULL, -- user_id
  corrected_at TIMESTAMPTZ DEFAULT NOW(),

  -- Feed this back to AI model for learning
  used_for_training BOOLEAN DEFAULT FALSE
);
```

---

## Matching Algorithm

### Step 1: Feature Extraction

Extract standardized features from provider data:

```typescript
interface HotelFeatures {
  // Text features
  normalizedName: string      // lowercase, no punctuation
  nameTokens: string[]        // split into words
  nameEmbedding: number[]     // semantic vector (OpenAI/local model)

  // Location features
  latitude: number
  longitude: number
  geohash: string             // for spatial bucketing

  // Address features
  street: string
  city: string
  state: string
  postalCode: string
  country: string

  // Property attributes
  starRating?: number
  chainCode?: string
  propertyType?: string

  // Fingerprint (for exact matching)
  fingerprint: string         // hash of key attributes
}
```

### Step 2: Candidate Generation

Find potential matches using multiple strategies:

1. **Exact Match** (fingerprint)
   - Hash: name + lat/lng (rounded) + city
   - O(1) lookup

2. **Geospatial Search** (geohash)
   - Find hotels within 500m radius
   - ~10-100 candidates typically

3. **Text Search** (normalized name)
   - Full-text search on hotel names
   - Fuzzy matching with Levenshtein

4. **Embedding Search** (vector similarity)
   - Semantic similarity of hotel names/descriptions
   - Use pgvector or separate vector DB

### Step 3: Scoring & Ranking

Score each candidate match:

```typescript
interface MatchScore {
  candidateId: string

  // Individual scores (0.0 - 1.0)
  nameScore: number          // String similarity
  locationScore: number      // GPS distance
  addressScore: number       // Address overlap
  embeddingScore: number     // Semantic similarity
  attributeScore: number     // Star rating, chain, etc.

  // Combined confidence
  totalScore: number         // Weighted average

  // Metadata
  matchMethod: string
  explanation: string
}
```

**Scoring Formula:**

```
totalScore = (
  nameScore * 0.40 +         // Most important
  locationScore * 0.30 +     // Very important
  embeddingScore * 0.15 +    // Catches variations
  addressScore * 0.10 +
  attributeScore * 0.05
)
```

**Decision Thresholds:**

- `score >= 0.95`: Auto-match (high confidence)
- `0.80 <= score < 0.95`: Auto-match with monitoring
- `0.60 <= score < 0.80`: Queue for human review
- `score < 0.60`: Create new canonical hotel

### Step 4: Caching Strategy

**Cache Layers:**

1. **In-Memory Cache** (Redis)
   - Hot path: provider_id → canonical_id
   - TTL: 24 hours
   - ~1ms lookup

2. **Database Cache** (PostgreSQL)
   - provider_mappings table
   - Indexed lookups
   - ~5-10ms

3. **Vector Cache** (if using embeddings)
   - Pre-computed embeddings for known hotels
   - Approximate nearest neighbor (ANN) index

---

## AI/ML Components

### Model 1: Hotel Name Embeddings

**Purpose:** Capture semantic similarity of hotel names

**Approach:**
- Use OpenAI embeddings API (text-embedding-3-small)
- Or fine-tune local model (BERT, sentence-transformers)
- Embed: name + address + city

**Example:**
```
"Hilton Times Square" → [0.12, -0.45, 0.89, ...]
"Times Square Hilton" → [0.13, -0.44, 0.88, ...] ← Similar!
"Marriott Times Square" → [0.31, -0.22, 0.76, ...] ← Different
```

### Model 2: Match Classifier

**Purpose:** Learn optimal scoring weights from corrections

**Input Features:**
- Name similarity (Levenshtein, Jaro-Winkler)
- GPS distance
- Address overlap
- Embedding cosine similarity
- Star rating difference
- Chain code match
- Property type match

**Output:**
- Probability that two hotels are the same

**Training Data:**
- Confirmed matches (from manual review)
- Confirmed non-matches
- GIATA mappings (bootstrap dataset)

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
✅ Database schema
✅ Basic matching algorithm (GPS + name)
✅ Provider mapping cache
✅ Admin review interface

### Phase 2: AI Enhancement (Week 3-4)
- Embedding generation
- ML scoring model
- Confidence thresholds
- Auto-matching pipeline

### Phase 3: Scale & Optimize (Week 5-6)
- Batch processing for provider catalogs
- Real-time matching optimization
- Monitoring & alerting
- A/B testing different algorithms

### Phase 4: Learning Loop (Week 7+)
- Feedback from user interactions
- Model retraining pipeline
- Active learning (prioritize uncertain cases)
- Performance metrics & dashboards

---

## Key Decisions Needed

### 1. **Embedding Provider**
   - **Option A**: OpenAI API ($0.02 per 1M tokens)
     - Pros: Best quality, no infra
     - Cons: API dependency, cost at scale

   - **Option B**: Local model (sentence-transformers)
     - Pros: No cost, full control
     - Cons: Need GPU, slightly lower quality

   - **Recommendation**: Start with OpenAI, migrate to local later

### 2. **Vector Database**
   - **Option A**: pgvector (PostgreSQL extension)
     - Pros: Same DB, simpler stack
     - Cons: Slower for huge scale (>10M vectors)

   - **Option B**: Dedicated (Pinecone, Weaviate, Qdrant)
     - Pros: Faster, built for vectors
     - Cons: Another service to manage

   - **Recommendation**: pgvector for MVP, evaluate later

### 3. **Human Review Workflow**
   - Build admin interface for reviewing matches
   - Show side-by-side comparison
   - Track reviewer agreement
   - Feed corrections back to model

### 4. **Initial Data Seeding**
   - Use GIATA for bootstrap (~1M hotels)
   - Don't depend on it ongoing
   - Verify/correct GIATA mappings over time

---

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Match accuracy | >99% | Manual review sample |
| False positive rate | <0.5% | User reports |
| Matching latency | <50ms | P95 |
| Cache hit rate | >95% | Redis metrics |
| Review queue size | <1000 | Daily |

---

## Cost Estimates

### Option 1: OpenAI Embeddings
- 1M hotels × 100 tokens avg = 100M tokens
- Initial: $2 one-time
- Ongoing: ~$10/month for new hotels

### Option 2: Local Embeddings
- GPU instance: ~$100-200/month
- Or serverless GPU (Modal, Replicate): $0.001/sec

### Storage
- PostgreSQL: ~100GB for 1M hotels with mappings
- Supabase free tier: 500MB (need paid plan ~$25/month)

---

## Next Steps

1. **Immediate** (This week):
   - Set up database schema
   - Build basic GPS + name matching
   - Create mapping cache

2. **Short-term** (Next week):
   - Integrate OpenAI embeddings
   - Build admin review UI
   - Test with Amadeus + one more provider

3. **Medium-term** (Next month):
   - Train ML model on corrections
   - Optimize matching algorithm
   - Scale to 3+ providers

---

## Open Questions

1. Should we build the ML model in-house or use a service?
2. How do we handle hotel chain rebrands/name changes?
3. What's our strategy for international hotels (non-English names)?
4. How do we handle temporary hotels (pop-ups, construction)?
5. Room-level matching strategy (separate from hotel matching)?

---

## References

- GIATA API documentation (for bootstrap data)
- OpenAI embeddings: https://platform.openai.com/docs/guides/embeddings
- pgvector: https://github.com/pgvector/pgvector
- Hotel deduplication research papers
