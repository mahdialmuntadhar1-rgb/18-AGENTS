-- Unified Businesses Table
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name JSONB NOT NULL, -- { "en": "...", "ar": "...", "ku": "..." }
  description JSONB, -- { "en": "...", "ar": "...", "ku": "..." }
  category TEXT NOT NULL,
  whatsapp TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  governorate TEXT NOT NULL,
  confidence_score FLOAT DEFAULT 0.0,
  is_verified BOOLEAN DEFAULT FALSE,
  needs_review BOOLEAN DEFAULT FALSE,
  scraped_photo_url TEXT,
  ai_processed_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent Logs Table
CREATE TABLE agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL, -- e.g., 'baghdad_agent', 'qc_overseer'
  message TEXT NOT NULL,
  type TEXT CHECK (type IN ('info', 'success', 'warning', 'error')),
  governorate TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Haversine Formula Function for Geofencing
CREATE OR REPLACE FUNCTION get_nearby_businesses(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 10.0
)
RETURNS SETOF businesses AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM businesses
  WHERE (
    6371 * acos(
      cos(radians(lat)) * cos(radians(latitude)) *
      cos(radians(longitude) - radians(lng)) +
      sin(radians(lat)) * sin(radians(latitude))
    )
  ) <= radius_km;
END;
$$ LANGUAGE plpgsql;

-- Real-time Replication (Enable for businesses and agent_logs)
ALTER PUBLICATION supabase_realtime ADD TABLE businesses;
ALTER PUBLICATION supabase_realtime ADD TABLE agent_logs;

-- Multi-source verification extension
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS name_ar TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS name_ku TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS subcategory TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Iraq';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS facebook_url TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS instagram_url TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS google_maps_url TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS source_evidence JSONB DEFAULT '[]'::jsonb;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS verification_strength TEXT DEFAULT 'weak';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'draft';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS hours TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS collected_by_agent TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS collected_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS matched_sources TEXT[] DEFAULT '{}';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS raw_source_payload_ref TEXT;
