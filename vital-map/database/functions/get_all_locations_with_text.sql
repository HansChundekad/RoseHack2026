CREATE OR REPLACE FUNCTION get_all_locations_with_text()
RETURNS TABLE (
  id bigint,
  name text,
  category text,
  description text,
  website_url text,
  location_text text,
  embedding vector(1536),
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
    ST_AsText(ST_Transform(l.location, 4326)::geometry) as location_text,
    l.embedding,
    l.created_at
  FROM locations l
  ORDER BY l.created_at DESC;
END;
$$ LANGUAGE plpgsql;
