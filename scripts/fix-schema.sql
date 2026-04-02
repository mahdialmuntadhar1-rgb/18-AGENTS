-- Fix for businesses table column mismatch
-- Run this in Supabase SQL Editor if you get "column business_name does not exist"

-- First, check what columns actually exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'businesses' 
ORDER BY ordinal_position;

-- If your table has 'name' instead of 'business_name', run this:
-- ALTER TABLE businesses RENAME COLUMN name TO business_name;

-- If the table exists but is missing columns, add them:
ALTER TABLE businesses 
  ADD COLUMN IF NOT EXISTS business_name text,
  ADD COLUMN IF NOT EXISTS business_name_ar text,
  ADD COLUMN IF NOT EXISTS business_name_ku text,
  ADD COLUMN IF NOT EXISTS subcategory text,
  ADD COLUMN IF NOT EXISTS tags text[],
  ADD COLUMN IF NOT EXISTS governorate text,
  ADD COLUMN IF NOT EXISTS country text default 'Iraq',
  ADD COLUMN IF NOT EXISTS latitude numeric(10, 8),
  ADD COLUMN IF NOT EXISTS longitude numeric(11, 8),
  ADD COLUMN IF NOT EXISTS google_maps_url text,
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS instagram_url text,
  ADD COLUMN IF NOT EXISTS tiktok_url text,
  ADD COLUMN IF NOT EXISTS opening_hours text,
  ADD COLUMN IF NOT EXISTS price_range text,
  ADD COLUMN IF NOT EXISTS rating numeric(3, 2),
  ADD COLUMN IF NOT EXISTS review_count integer,
  ADD COLUMN IF NOT EXISTS images text[],
  ADD COLUMN IF NOT EXISTS created_by_agent text,
  ADD COLUMN IF NOT EXISTS confidence_score numeric(3, 2),
  ADD COLUMN IF NOT EXISTS status text default 'active',
  ADD COLUMN IF NOT EXISTS scraped_at timestamptz default now();

-- Ensure verification_status exists with default
ALTER TABLE businesses 
  ALTER COLUMN verification_status SET DEFAULT 'pending';

-- Fix any null business_names from old data
UPDATE businesses 
SET business_name = name 
WHERE business_name IS NULL AND name IS NOT NULL;

-- Drop old 'name' column if it exists (data migrated above)
-- ALTER TABLE businesses DROP COLUMN IF EXISTS name;

-- Recreate indexes
CREATE UNIQUE INDEX IF NOT EXISTS businesses_unique_identity_idx
  ON businesses (business_name, address, city);

CREATE INDEX IF NOT EXISTS businesses_category_city_idx
  ON businesses (category, city);

CREATE INDEX IF NOT EXISTS businesses_source_idx
  ON businesses (source_name, external_source_id);

CREATE INDEX IF NOT EXISTS businesses_agent_idx
  ON businesses (created_by_agent, scraped_at DESC);
