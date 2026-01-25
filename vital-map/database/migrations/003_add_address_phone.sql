-- Migration: Add address and phone_number columns to locations table
-- Date: 2026-01-25
-- Description: Adds address (required) and phone_number (optional) fields to support
--              better location data and match scraper output schema

-- Add address column (text, required)
-- Using temporary default to allow adding NOT NULL column to existing table
ALTER TABLE locations
  ADD COLUMN address text NOT NULL DEFAULT '';

-- Add phone_number column (text, optional)
ALTER TABLE locations
  ADD COLUMN phone_number text;

-- Remove default constraint after column is added
-- Future inserts will require explicit address value
ALTER TABLE locations
  ALTER COLUMN address DROP DEFAULT;

-- Create GIN index on address for full-text search performance
-- This enables efficient text search queries on addresses
CREATE INDEX idx_locations_address ON locations USING gin(to_tsvector('english', address));

-- Migration complete
-- Next steps:
--   1. Update all RPC functions to return new fields
--   2. Update frontend types to include address and phone_number
--   3. Update UI components to display new fields
