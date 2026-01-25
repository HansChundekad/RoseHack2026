-- Seed: Real LA Hospital Locations
-- Date: 2026-01-25
-- Description: 3 real hospital locations in Los Angeles area
-- Usage: Paste this into Supabase SQL Editor and run

-- Insert 3 real LA hospitals with clinical category
-- Embeddings are NULL (not needed for basic display)
-- Coordinates are real lat/lng converted to PostGIS POINT format
INSERT INTO locations (name, category, description, website_url, address, phone_number, geom, embedding) VALUES
('Cedars-Sinai Medical Center', 'clinical', 'Major medical center in Beverly Grove', 'https://www.cedars-sinai.org', '8700 Beverly Blvd, Los Angeles, CA 90048', '(310) 423-3277', ST_SetSRID(ST_MakePoint(-118.3833, 34.0736), 4326), NULL),
('UCLA Medical Center', 'clinical', 'Academic medical center in Westwood', 'https://www.uclahealth.org', '757 Westwood Plaza, Los Angeles, CA 90095', '(310) 825-9111', ST_SetSRID(ST_MakePoint(-118.4456, 34.0689), 4326), NULL),
('Los Angeles County + USC Medical Center', 'clinical', 'Public hospital in Boyle Heights', 'https://dhs.lacounty.gov', '1200 N State St, Los Angeles, CA 90033', '(323) 226-2622', ST_SetSRID(ST_MakePoint(-118.2064, 34.0598), 4326), NULL);

-- Verification query (optional - run separately to check)
-- SELECT name, category, address, ST_AsText(geom) as location FROM locations WHERE category = 'clinical' ORDER BY name;
