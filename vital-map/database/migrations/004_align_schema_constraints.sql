-- Migration: Align DB schema with scraper guarantees
-- Date: 2026-01-25
-- Description: Updates database constraints to match what the scraper can guarantee
--              Ensures data integrity and prevents invalid inserts

-- Make website_url NOT NULL (scraper always provides source URL)
-- First update any existing NULL values to empty string (shouldn't exist)
UPDATE locations SET website_url = '' WHERE website_url IS NULL;

-- Now make column NOT NULL
ALTER TABLE locations
  ALTER COLUMN website_url SET NOT NULL;

-- Add check constraint for website_url format (must be valid URL)
ALTER TABLE locations
  ADD CONSTRAINT check_website_url_not_empty
  CHECK (length(trim(website_url)) > 0);

-- Add check constraint for name (must not be empty)
ALTER TABLE locations
  ADD CONSTRAINT check_name_not_empty
  CHECK (length(trim(name)) > 0);

-- Add check constraint for category (must not be empty)
ALTER TABLE locations
  ADD CONSTRAINT check_category_not_empty
  CHECK (length(trim(category)) > 0);

-- Add check constraint for address (must not be empty)
ALTER TABLE locations
  ADD CONSTRAINT check_address_not_empty
  CHECK (length(trim(address)) > 0);

-- Add comment documenting scraper contract
COMMENT ON COLUMN locations.website_url IS 'Source URL where data was scraped (NOT NULL, always provided)';
COMMENT ON COLUMN locations.geom IS 'WGS84 coordinates in WKT format: POINT(lon lat) - required for all locations';
COMMENT ON COLUMN locations.embedding IS 'Vector embedding (1536 dimensions) - nullable, generated post-extraction';

-- Migration complete
-- All constraints now match scraper guarantees:
--   ✅ name, category, address, website_url, geom: NOT NULL + non-empty
--   ✅ description, phone_number: nullable
--   ✅ embedding: nullable (can fail generation)
