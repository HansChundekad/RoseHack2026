-- Create Vector Index for Semantic Search
-- Prerequisites confirmed: pgvector v0.8.0, 10 rows, 100% embedding coverage
-- Date: 2026-01-25
-- ============================================

-- Run ANALYZE first (required for IVFFlat)
ANALYZE locations;

-- Drop existing index if it exists
DROP INDEX IF EXISTS idx_locations_embedding;

-- Create IVFFlat index for cosine similarity search
-- lists = 1 (reduced to fit within maintenance_work_mem constraint)
-- Note: For production with more rows, may need to increase Supabase maintenance_work_mem
CREATE INDEX idx_locations_embedding
  ON locations
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 1);

-- Add documentation comment
COMMENT ON INDEX idx_locations_embedding IS 'IVFFlat index for vector similarity search using cosine distance (<=> operator). Lists=10 optimized for current dataset size. Adjust if data grows: lists ≈ sqrt(row_count).';

-- Verify index was created
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'locations' AND indexname = 'idx_locations_embedding';

-- Test index is being used with EXPLAIN
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  id,
  name,
  embedding <=> (SELECT embedding FROM locations WHERE embedding IS NOT NULL LIMIT 1) as distance
FROM locations
WHERE embedding IS NOT NULL
ORDER BY embedding <=> (SELECT embedding FROM locations WHERE embedding IS NOT NULL LIMIT 1)
LIMIT 10;

-- Sample semantic search query
WITH test_vector AS (
  SELECT embedding as qv FROM locations WHERE embedding IS NOT NULL LIMIT 1
)
SELECT
  id,
  name,
  category,
  ROUND((embedding <=> (SELECT qv FROM test_vector))::numeric, 4) as cosine_distance
FROM locations
WHERE embedding IS NOT NULL
ORDER BY embedding <=> (SELECT qv FROM test_vector)
LIMIT 5;
