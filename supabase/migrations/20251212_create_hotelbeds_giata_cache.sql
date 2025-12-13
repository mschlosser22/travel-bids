-- HotelBeds GIATA Code Cache
-- Stores permanent mapping between HotelBeds hotel codes and GIATA IDs
-- This eliminates the need to call Content API during every search

CREATE TABLE IF NOT EXISTS hotelbeds_hotel_metadata (
  -- Primary key
  hotelbeds_code INTEGER PRIMARY KEY,

  -- GIATA ID (industry standard hotel identifier)
  giata_id VARCHAR(50),

  -- Hotel basic info (for debugging/verification)
  name TEXT NOT NULL,
  country_code VARCHAR(2),
  destination_code VARCHAR(10),
  category_code VARCHAR(10),

  -- Coordinates (for GPS fallback if GIATA missing)
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),

  -- Metadata
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Tracking
  data_source VARCHAR(50) DEFAULT 'content_api'
);

-- Index for fast GIATA lookups
CREATE INDEX IF NOT EXISTS idx_hotelbeds_giata ON hotelbeds_hotel_metadata(giata_id) WHERE giata_id IS NOT NULL;

-- Index for destination-based bulk fetching
CREATE INDEX IF NOT EXISTS idx_hotelbeds_destination ON hotelbeds_hotel_metadata(destination_code);

-- Index for coordinate-based searches
CREATE INDEX IF NOT EXISTS idx_hotelbeds_coordinates ON hotelbeds_hotel_metadata(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Function to update timestamp on update
CREATE OR REPLACE FUNCTION update_hotelbeds_metadata_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamp
DROP TRIGGER IF EXISTS update_hotelbeds_metadata_timestamp ON hotelbeds_hotel_metadata;
CREATE TRIGGER update_hotelbeds_metadata_timestamp
  BEFORE UPDATE ON hotelbeds_hotel_metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_hotelbeds_metadata_timestamp();

-- Comment
COMMENT ON TABLE hotelbeds_hotel_metadata IS 'Cache for HotelBeds hotel metadata including GIATA codes from Content API. Eliminates need for repeated API calls during search operations.';
