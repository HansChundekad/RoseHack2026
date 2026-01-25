-- Function: semantic_search
-- Description: Semantic search using vector similarity (cosine distance)
-- Parameters: query_vector (1536-dim), similarity_threshold, limit_count
-- Returns: Table with location data + similarity_score
-- Date: 2026-01-25

-- Drop existing function if signature changed
DROP FUNCTION IF EXISTS semantic_search(vector, double precision, int);

CREATE OR REPLACE FUNCTION semantic_search(
  query_vector vector(1536),
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
  similarity_score double precision
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
    l.created_at,
    (l.embedding <=> query_vector) as similarity_score
  FROM locations l
  WHERE l.embedding IS NOT NULL
    AND (l.embedding <=> query_vector) < similarity_threshold
  ORDER BY l.embedding <=> query_vector ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON FUNCTION semantic_search(vector, double precision, int) IS
  'Semantic search: Returns locations ranked by vector similarity. Uses <=> (cosine distance) operator with IVFFlat index. Score range: 0 (identical) to 2 (opposite). Filters NULL embeddings.';
