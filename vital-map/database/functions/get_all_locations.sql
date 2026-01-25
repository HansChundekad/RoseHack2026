-- Function: get_all_locations
-- Description: Returns all locations with geometry converted to text format
-- Returns: Table with location data and ST_AsText(geom) as location string
-- Date: 2026-01-24

-- Drop existing function if return type changed
DROP FUNCTION IF EXISTS get_all_locations();

CREATE OR REPLACE FUNCTION get_all_locations()
RETURNS TABLE (
  id bigint,
  name text,
  category text,
  description text,
  website_url text,
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
    CASE
      WHEN l.geom IS NOT NULL THEN ST_AsText(l.geom)
      ELSE NULL
    END as location,
    l.created_at
  FROM locations l
  ORDER BY l.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON FUNCTION get_all_locations() IS
  'Returns all locations with geom column converted to WKT text (POINT(lng lat)). Embedding vector excluded from response for performance.';
