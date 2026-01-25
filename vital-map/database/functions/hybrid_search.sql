-- Function: hybrid_search
-- Description: Hybrid geo + semantic search with 50/50 weighted ranking
-- Parameters: query_vector, center coords, radius_meters, similarity_threshold, limit
-- Returns: Table with location data + similarity_score + geo_distance + combined_score
-- Date: 2026-01-25

-- Drop existing function if signature changed
DROP FUNCTION IF EXISTS hybrid_search(vector, double precision, double precision, double precision, double precision, int);

CREATE OR REPLACE FUNCTION hybrid_search(
  query_vector vector(1536),
  center_lng double precision,
  center_lat double precision,
  radius_meters double precision DEFAULT 50000,
  similarity_threshold double precision DEFAULT 2.0,
  limit_count int DEFAULT 50
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
  created_at timestamptz,
  similarity_score double precision,
  geo_distance double precision,
  combined_score double precision
) AS $$
BEGIN
  RETURN QUERY
  WITH search_candidates AS (
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
      l.created_at,
      ST_Distance(
        l.geom::geography,
        ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography
      ) as geo_dist,
      (l.embedding <=> query_vector) as semantic_dist
    FROM locations l
    WHERE l.embedding IS NOT NULL
      AND l.geom IS NOT NULL
      AND ST_DWithin(
        l.geom::geography,
        ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography,
        radius_meters
      )
      AND (l.embedding <=> query_vector) < similarity_threshold
  ),
  max_values AS (
    SELECT
      GREATEST(MAX(geo_dist), 1.0) as max_geo,
      GREATEST(MAX(semantic_dist), 0.001) as max_semantic
    FROM search_candidates
  )
  SELECT
    sc.id,
    sc.name,
    sc.category,
    sc.description,
    sc.website_url,
    sc.address,
    sc.phone_number,
    sc.location,
    sc.created_at,
    sc.semantic_dist as similarity_score,
    sc.geo_dist as geo_distance,
    ((sc.geo_dist / mv.max_geo) * 0.5 + (sc.semantic_dist / mv.max_semantic) * 0.5) as combined_score
  FROM search_candidates sc
  CROSS JOIN max_values mv
  ORDER BY combined_score ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add comment for documentation
COMMENT ON FUNCTION hybrid_search(vector, double precision, double precision, double precision, double precision, int) IS
  'Hybrid search: Combines geographic proximity and semantic similarity with 50/50 weighting. Returns normalized combined_score (0=perfect, 1=worst). Uses geography type for accurate meter-based distance.';
