-- Migration: Add deduplication strategy
-- Date: 2026-01-25
-- Description: Removes duplicate website_urls (keeps newest), then adds UNIQUE constraint
--              Enables idempotent upserts for scraper reruns

-- Step 1: Remove duplicate website_urls, keeping the most recent entry (by id or created_at)
-- This CTE finds all duplicates and deletes all but the newest one
DELETE FROM locations
WHERE id NOT IN (
  SELECT DISTINCT ON (website_url) id
  FROM locations
  ORDER BY website_url, created_at DESC NULLS LAST, id DESC
);

-- Step 2: Add UNIQUE constraint on website_url
-- website_url is the natural key (source URL where data was scraped)
ALTER TABLE locations
  ADD CONSTRAINT unique_website_url UNIQUE (website_url);

-- Add documentation
COMMENT ON CONSTRAINT unique_website_url ON locations IS
  'Ensures each source URL is only stored once. Enables ON CONFLICT upserts for idempotent scraping.';

-- Migration complete
-- Duplicates removed, constraint added
-- Scraper can now use:
--   INSERT INTO locations (...) VALUES (...)
--   ON CONFLICT (website_url) DO UPDATE SET ...
