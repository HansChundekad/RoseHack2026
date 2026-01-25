-- Function: match_locations
-- Description: Spatial search - returns locations within a bounding box
-- Parameters: min_lng, min_lat, max_lng, max_lat (bounding box coordinates)
-- Returns: Table with location data within the bounds
-- Date: 2026-01-24

-- Drop existing function if signature changed
DROP FUNCTION IF EXISTS match_locations(double precision, double precision, double precision, double precision);

CREATE OR REPLACE FUNCTION match_locations(
  min_lng double precision,
  min_lat double precision,
  max_lng double precision,
  max_lat double precision
)
RETURNS TABLE (
  id bigint,
  name text,
  category text,
  description text,
  website_url text,
  address text,
  phone_number text,
  location text,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.name,
    l.category,
    l.description,
    l.website_url,
    l.address,
    l.phone_number,
    CASE
      WHEN l.geom IS NOT NULL THEN ST_AsText(l.geom)
      ELSE NULL
    END as location,
    l.created_at
  FROM locations l
  WHERE l.geom IS NOT NULL
    AND ST_Intersects(
      l.geom,
      ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)
    )
  ORDER BY l.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON FUNCTION match_locations(double precision, double precision, double precision, double precision) IS
  'Spatial search: Returns locations within a bounding box. Uses ST_Intersects for efficient spatial filtering.';
