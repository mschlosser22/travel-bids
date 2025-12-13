-- Add slug field to canonical_hotels for LLM-friendly URLs
-- Migration: 20251212_add_slug_to_canonical_hotels

-- Add slug column (nullable initially to handle existing records)
ALTER TABLE canonical_hotels
ADD COLUMN slug TEXT;

-- Create unique index on slug (partial index to allow NULLs)
CREATE UNIQUE INDEX idx_canonical_hotels_slug
ON canonical_hotels(slug)
WHERE slug IS NOT NULL;

-- Add index for slug lookups (faster queries)
CREATE INDEX idx_canonical_hotels_slug_lookup
ON canonical_hotels(slug)
WHERE slug IS NOT NULL;

-- Add comment explaining the field
COMMENT ON COLUMN canonical_hotels.slug IS 'LLM-friendly URL slug generated from hotel name and city (e.g., marriott-marquis-times-square-nyc)';
