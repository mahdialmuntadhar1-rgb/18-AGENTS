-- Migration: Update businesses table to new schema
-- Run this in Supabase SQL Editor

-- Step 1: Add new columns (if they don't exist)
ALTER TABLE businesses 
  ADD COLUMN IF NOT EXISTS business_name text,
  ADD COLUMN IF NOT EXISTS business_name_ar text,
  ADD COLUMN IF NOT EXISTS business_name_ku text,
  ADD COLUMN IF NOT EXISTS subcategory text,
  ADD COLUMN IF NOT EXISTS tags text[],
  ADD COLUMN IF NOT EXISTS governorate text,
  ADD COLUMN IF NOT EXISTS country text DEFAULT 'Iraq',
  ADD COLUMN IF NOT EXISTS latitude numeric(10, 8),
  ADD COLUMN IF NOT EXISTS longitude numeric(11, 8),
  ADD COLUMN IF NOT EXISTS google_maps_url text,
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS facebook_url text,
  ADD COLUMN IF NOT EXISTS instagram_url text,
  ADD COLUMN IF NOT EXISTS tiktok_url text,
  ADD COLUMN IF NOT EXISTS opening_hours text,
  ADD COLUMN IF NOT EXISTS price_range text,
  ADD COLUMN IF NOT EXISTS review_count integer,
  ADD COLUMN IF NOT EXISTS images text[],
  ADD COLUMN IF NOT EXISTS confidence_score numeric(3, 2),
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS scraped_at timestamptz;

-- Step 2: Migrate data from old 'name' column to new 'business_name' column
UPDATE businesses 
SET business_name = name 
WHERE business_name IS NULL AND name IS NOT NULL;

-- Step 3: Add source columns if missing
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS source_name text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS external_source_id text;

-- Step 4: Drop the old unique index
DROP INDEX IF EXISTS businesses_unique_identity_idx;

-- Step 5: Create new unique index on business_name
CREATE UNIQUE INDEX IF NOT EXISTS businesses_unique_identity_idx
  ON businesses (business_name, address, city);

-- Step 6: Add additional indexes for performance
CREATE INDEX IF NOT EXISTS businesses_category_city_idx
  ON businesses (category, city);

CREATE INDEX IF NOT EXISTS businesses_source_idx
  ON businesses (source_name, external_source_id);

CREATE INDEX IF NOT EXISTS businesses_agent_idx
  ON businesses (created_by_agent, scraped_at desc);

-- Step 7: Update timestamps for existing rows
UPDATE businesses 
SET scraped_at = COALESCE(created_at, now()) 
WHERE scraped_at IS NULL;

-- Step 8: Make business_name NOT NULL where data exists
-- (Run this after verifying data migrated)
-- ALTER TABLE businesses ALTER COLUMN business_name SET NOT NULL;

SELECT 'Migration complete! Updated ' || COUNT(*) || ' records.' as result 
FROM businesses;
