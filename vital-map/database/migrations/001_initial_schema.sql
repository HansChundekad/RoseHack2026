-- Migration: Initial Schema for Vital Map
-- Description: Creates locations and reviews tables with PostGIS and vector support
-- Date: 2026-01-24

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;

-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name text NOT NULL,
    category text NOT NULL,
    description text,
    website_url text,
    geom geometry(Point, 4326) NOT NULL,
    embedding vector(1536),
    created_at timestamptz DEFAULT now()
);

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    location_id bigint NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment text,
    created_at timestamptz DEFAULT now()
);

-- Create indexes on locations table
-- GIST index for spatial queries
CREATE INDEX IF NOT EXISTS idx_locations_geom
    ON locations USING GIST (geom);

-- Index on category for filtering
CREATE INDEX IF NOT EXISTS idx_locations_category
    ON locations (category);

-- IVFFlat index on embeddings for vector similarity search
-- NOTE: This index requires data in the table before creating.
-- Run ANALYZE locations after inserting data, then execute:
-- CREATE INDEX IF NOT EXISTS idx_locations_embedding
--     ON locations USING ivfflat (embedding vector_cosine_ops)
--     WITH (lists = 100);
--
-- The 'lists' parameter should be approximately sqrt(row_count).
-- For 10,000 rows, use lists = 100
-- For 1,000,000 rows, use lists = 1000

-- Add comments for documentation
COMMENT ON TABLE locations IS 'Stores location data with spatial coordinates and vector embeddings';
COMMENT ON TABLE reviews IS 'Stores user reviews for locations';
COMMENT ON COLUMN locations.geom IS 'Geometric point in WGS84 (EPSG:4326) - longitude/latitude';
COMMENT ON COLUMN locations.embedding IS 'Vector embedding for semantic search (1536 dimensions for OpenAI)';
COMMENT ON COLUMN reviews.rating IS 'Rating from 1 to 5 stars';
