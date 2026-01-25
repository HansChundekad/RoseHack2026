# Testing Semantic & Hybrid Search Functions

Run these tests in the Supabase SQL Editor after deploying the functions.

## Test 1: Semantic Search - Basic Functionality

```sql
-- Get a test embedding from the database
WITH test_query AS (
  SELECT embedding FROM locations WHERE embedding IS NOT NULL LIMIT 1
)
SELECT
  id,
  name,
  category,
  ROUND(similarity_score::numeric, 4) as similarity
FROM semantic_search((SELECT embedding FROM test_query), 2.0, 10)
ORDER BY similarity_score;
```

**Expected Results:**
- First result should have `similarity = 0.0000` (exact match with itself)
- Results ordered by similarity ascending
- All results have similarity_score < 2.0

---

## Test 2: Hybrid Search - Basic Functionality

```sql
-- Test hybrid search around Los Angeles coordinates
WITH test_query AS (
  SELECT embedding FROM locations WHERE embedding IS NOT NULL LIMIT 1
)
SELECT
  id,
  name,
  ROUND(similarity_score::numeric, 4) as semantic,
  ROUND(geo_distance::numeric, 0) as meters,
  ROUND(combined_score::numeric, 4) as combined
FROM hybrid_search(
  (SELECT embedding FROM test_query),
  -118.2437, 34.0522,  -- LA coordinates
  50000,               -- 50km radius
  2.0, 10
)
ORDER BY combined_score;
```

**Expected Results:**
- All `combined_score` values between 0 and 1
- All `meters` values ≤ 50000
- Results ordered by combined_score ascending (0 = best match)
- Shows semantic, geo, and combined scores for each result

---

## Test 3: Verify Vector Index Usage

```sql
-- Check if IVFFlat index is being used
EXPLAIN ANALYZE
SELECT * FROM semantic_search(
  (SELECT embedding FROM locations WHERE id = 1),
  2.0, 10
);
```

**Expected Results:**
- Query plan should show index usage (though with only 10 rows, may use sequential scan)
- Execution time should be fast (< 100ms)

---

## Test 4: Verify NULL Filtering

```sql
-- Count total locations with embeddings
SELECT COUNT(*) as total_with_embeddings
FROM locations
WHERE embedding IS NOT NULL;

-- Verify semantic search excludes NULLs
SELECT COUNT(*) as semantic_results
FROM semantic_search(
  (SELECT embedding FROM locations WHERE embedding IS NOT NULL LIMIT 1),
  2.0, 100
);
```

**Expected Results:**
- Both counts should be equal (10 if using seed data)
- Confirms NULL embeddings are filtered out

---

## Test 5: Edge Case - Empty Results

```sql
-- Search with very strict threshold (should return few or no results)
SELECT COUNT(*) as strict_results
FROM semantic_search(
  (SELECT embedding FROM locations LIMIT 1),
  0.001,  -- Very strict threshold
  10
);
```

**Expected Results:**
- Should return 0 or 1 result (only exact match)
- No errors thrown

---

## Test 6: Hybrid Search - Different Locations

```sql
-- New York City coordinates (should return different results than LA)
WITH test_query AS (
  SELECT embedding FROM locations WHERE embedding IS NOT NULL LIMIT 1
)
SELECT
  id,
  name,
  ROUND(geo_distance::numeric, 0) as meters,
  ROUND(combined_score::numeric, 4) as score
FROM hybrid_search(
  (SELECT embedding FROM test_query),
  -74.0060, 40.7128,  -- NYC coordinates
  50000, 2.0, 10
)
ORDER BY combined_score;
```

**Expected Results:**
- Different geo_distance values compared to LA search
- combined_score accounts for both location and semantic similarity

---

## Frontend Testing (Browser Console)

After deploying RPC functions, test from the frontend:

### Test 1: Semantic Search

```typescript
// In browser console (on a page using useResources hook)
const { semanticSearch } = useResources();

// Create a test vector (1536 dimensions with value 0.100, matching seed data)
const testVector = Array(1536).fill(0.100);

// Run semantic search
const results = await semanticSearch(testVector);

console.log('Results:', results);
console.log('First result similarity:', results[0]?.similarity_score);

// Expected: results[0].similarity_score should be ≈ 0.0 (exact match)
// Expected: All results have similarity_score property
```

### Test 2: Hybrid Search

```typescript
// Test hybrid search around Los Angeles
const { hybridSearch } = useResources();
const testVector = Array(1536).fill(0.100);

const results = await hybridSearch(testVector, -118.2437, 34.0522, 50000);

console.log('Results:', results);
console.log('Scores:', results.map(r => ({
  name: r.name,
  similarity: r.similarity_score,
  geo_meters: r.geo_distance,
  combined: r.combined_score
})));

// Expected: All results have similarity_score, geo_distance, combined_score
// Expected: geo_distance values in meters
// Expected: combined_score between 0 and 1
```

### Test 3: Validation Errors

```typescript
// Test with invalid vector dimensions (should throw error)
try {
  await semanticSearch([1, 2, 3]); // Wrong size
} catch (error) {
  console.log('Expected error:', error.message);
  // Expected: "Invalid vector dimensions: expected 1536, got 3"
}

// Test with invalid coordinates (should throw error)
try {
  await hybridSearch(testVector, 999, 999, 50000); // Invalid coords
} catch (error) {
  console.log('Expected error:', error.message);
  // Expected: "Invalid longitude: 999"
}
```

---

## Performance Benchmarks

With the seed data (10 rows), both functions should be very fast:

- **semantic_search()**: < 50ms
- **hybrid_search()**: < 100ms (two-pass algorithm)

As the dataset grows, the IVFFlat vector index will maintain performance:

- **1,000 rows**: ~50ms
- **10,000 rows**: ~100ms
- **100,000+ rows**: ~200ms (index critical at this scale)

---

## Troubleshooting

### Error: "function semantic_search does not exist"
- Deploy the SQL function from `database/functions/semantic_search.sql`

### Error: "operator does not exist: vector <=> vector"
- Ensure pgvector extension is enabled: `CREATE EXTENSION IF NOT EXISTS vector;`

### Error: "column embedding does not exist"
- Verify locations table has embedding column: `\d locations`

### Empty results from semantic_search
- Check if any rows have non-NULL embeddings: `SELECT COUNT(*) FROM locations WHERE embedding IS NOT NULL;`
- Try increasing similarity_threshold to 2.0

### Empty results from hybrid_search
- Check if location is within radius
- Check if any locations have both embedding AND geom non-NULL
- Try increasing radius_meters or similarity_threshold
