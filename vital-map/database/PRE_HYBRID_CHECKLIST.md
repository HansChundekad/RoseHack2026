# Pre-Hybrid Search Checklist

## Status: Ready for Manual Verification

Before implementing hybrid geo + semantic search, verify these items in Supabase SQL Editor.

---

## ✅ 1. Database Connection & Permissions

### To Verify:
```sql
-- Run as anon role (what frontend uses)
SELECT current_user, current_setting('role');

-- Test RLS allows SELECT
SELECT COUNT(*) FROM locations;

-- Test RPC functions work with anon role
SELECT * FROM get_all_locations() LIMIT 1;
SELECT * FROM match_locations(-118.5, 33.7, -118.0, 34.2) LIMIT 1;
```

### Expected:
- ✅ SELECT works (RLS policy: `locations_select_public`)
- ✅ RPC functions return data

### If Fails:
- Check RLS policies are applied
- Consider adding `SECURITY DEFINER` to RPC functions

---

## ✅ 2. Embedding Data Check

### To Verify:
```sql
-- Check embedding coverage
SELECT
  COUNT(*) as total_rows,
  COUNT(embedding) as rows_with_embedding,
  COUNT(*) FILTER (WHERE embedding IS NULL) as rows_without_embedding,
  ROUND(100.0 * COUNT(embedding) / COUNT(*), 2) || '%' as coverage
FROM locations;

-- Check dimensions
SELECT
  id,
  name,
  vector_dims(embedding) as dims,
  CASE WHEN vector_dims(embedding) = 1536 THEN '✅' ELSE '❌' END as valid
FROM locations
WHERE embedding IS NOT NULL
LIMIT 3;
```

### Expected:
- All seed data rows (10) have embeddings
- All embeddings are 1536 dimensions
- Coverage: 100%

### Current Seed Data:
```sql
-- From seeds/001_mock_data.sql
-- All rows use mock embeddings: array_fill(0.100::real, ARRAY[1536])::vector(1536)
```

### ✅ NULL Embedding Handling Strategy: **FILTER OUT NULLS**

**Decision Made**: Filter out NULL embeddings in hybrid search.

```sql
WHERE embedding IS NOT NULL
  AND (embedding <=> query_vector) < threshold
```

**Rationale**:
- Clean semantics: hybrid search requires BOTH geo AND semantic ranking
- Better performance: simpler WHERE clause, no CASE in ORDER BY
- Predictable results: no mixing of ranked vs unranked items
- Current state: All seed data has embeddings, so no data loss

---

## ✅ 3. Geo Index & Queries

### To Verify:
```sql
-- Check GiST index exists
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'locations' AND indexname = 'idx_locations_geom';

-- Test index is being used (should show "Index Scan")
EXPLAIN
SELECT *
FROM locations
WHERE ST_Intersects(
  geom,
  ST_MakeEnvelope(-118.5, 33.7, -118.0, 34.2, 4326)
);
```

### Expected:
- ✅ Index exists: `idx_locations_geom USING gist (geom)`
- ✅ Query plan shows "Index Scan" or "Bitmap Index Scan"

---

## ✅ 4. Geo Math Correctness

### Current Implementation (match_locations.sql):
```sql
WHERE ST_Intersects(
  l.geom,
  ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)
)
```

### ✅ Correctness Check:
- Uses `geometry` type (fast, indexed)
- Uses SRID 4326 (WGS84, matches column definition)
- Uses `ST_Intersects` (fast with GiST index)

### ⚠️ If Adding Radius Search:

**WRONG** (uses degrees, not meters):
```sql
ST_DWithin(geom, center_point, 5000)  -- 5000 degrees!
```

**CORRECT** (meters):
```sql
ST_DWithin(geom::geography, center_point::geography, 5000)  -- 5000 meters
```

### Distance Calculation for Ranking:
```sql
-- For meters (accounts for Earth curvature):
ST_Distance(geom::geography, center::geography)

-- For degrees (fast but imprecise):
ST_Distance(geom, center)
```

---

## ✅ 5. RPC Signature & Type Gotchas

### Current RPC Functions - Review:

#### get_all_locations() - ✅ CORRECT
```sql
CREATE OR REPLACE FUNCTION get_all_locations()
RETURNS TABLE (
  id bigint,
  name text,
  category text,
  description text,
  website_url text,
  location text,  -- WKT from ST_AsText(geom)
  created_at timestamptz
)
```

**Status**: ✅ Signature matches actual SELECT

#### match_locations() - ✅ CORRECT
```sql
CREATE OR REPLACE FUNCTION match_locations(
  min_lng double precision,
  min_lat double precision,
  max_lng double precision,
  max_lat double precision
)
RETURNS TABLE (...)
```

**Status**: ✅ Signature matches actual SELECT

### ⚠️ Future hybrid_search() - Common Gotchas:

#### Gotcha 1: Vector Parameter Type
```sql
-- CORRECT:
CREATE FUNCTION hybrid_search(
  query_vector vector(1536),  -- NOT real[], NOT double precision[]
  ...
)

-- Called from JS:
supabase.rpc('hybrid_search', {
  query_vector: [0.1, 0.2, ...]  // Plain JS array, Supabase converts
})
```

#### Gotcha 2: Return Type Must Match SELECT
```sql
RETURNS TABLE (
  id bigint,
  name text,
  location text,
  similarity double precision,  -- New computed field
  geo_distance double precision -- New computed field
)

-- SELECT must include ALL these columns:
SELECT
  l.id,
  l.name,
  ST_AsText(l.geom) as location,
  (l.embedding <=> query_vector) as similarity,
  ST_Distance(l.geom::geography, center::geography) as geo_distance
FROM locations l
```

#### Gotcha 3: NULL Handling in WHERE
```sql
-- BAD: Silently excludes NULLs, no error
WHERE (embedding <=> query_vector) < 1.0

-- GOOD: Explicit NULL handling
WHERE embedding IS NOT NULL
  AND (embedding <=> query_vector) < 1.0
```

#### Gotcha 4: Default Parameters
```sql
-- GOOD: Provide defaults for optional params
CREATE FUNCTION hybrid_search(
  query_vector vector(1536),
  center_lng double precision,
  center_lat double precision,
  radius_meters double precision DEFAULT 50000,
  similarity_threshold double precision DEFAULT 1.0,
  limit_count int DEFAULT 50
)
```

---

## ✅ 6. Current Issues to Fix

### Issue 1: NULL Embedding Strategy
**Status**: ✅ **DECIDED** - Filter out NULLs with `WHERE embedding IS NOT NULL`
**Implementation**: Apply this filter in all hybrid search queries

### Issue 2: Vector Index
**Status**: Not created yet (will handle after this checklist)
**Note**: Semantic search will be SLOW without index

### Issue 3: RPC Function SECURITY
**Check**: Do RPC functions bypass RLS or execute as caller?
**Test**:
```sql
-- Check function security type
SELECT
  proname,
  prosecdef as is_security_definer
FROM pg_proc
WHERE proname IN ('get_all_locations', 'match_locations');
```

**If `is_security_definer = false`**: Functions execute as caller (respects RLS)
**If `is_security_definer = true`**: Functions bypass RLS

**Current setup**: Functions likely execute as caller, which is fine since anon role has SELECT permission.

---

## 🎯 Manual Verification Steps

Run these in Supabase SQL Editor: https://supabase.com/dashboard/project/izkjkpnozgqcmqgfhixv/sql

### Step 1: Basic Checks
```sql
-- Row count
SELECT COUNT(*) FROM locations;

-- Embedding coverage
SELECT
  COUNT(*) as total,
  COUNT(embedding) as with_embedding
FROM locations;
```

### Step 2: Test Current RPC Functions
```sql
-- Test get_all_locations
SELECT * FROM get_all_locations() LIMIT 3;

-- Test match_locations (LA area)
SELECT * FROM match_locations(-118.5, 33.7, -118.0, 34.2);
```

### Step 3: Check Indexes
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'locations';
```

### Step 4: Test Geo Queries
```sql
-- Bounding box (should use index)
EXPLAIN ANALYZE
SELECT COUNT(*)
FROM locations
WHERE ST_Intersects(
  geom,
  ST_MakeEnvelope(-118.5, 33.7, -118.0, 34.2, 4326)
);
```

---

## ✅ Sign-off Checklist

Before implementing hybrid search:

- [ ] Database connection works
- [ ] All seed data loaded (10 rows)
- [ ] All rows have embeddings (1536-dim)
- [ ] Spatial index exists and is being used
- [ ] Current RPC functions work
- [x] Decided NULL embedding handling strategy → **Filter out NULLs**
- [x] Understand geo math (geometry vs geography)
- [x] Know RPC type gotchas (vector params, return types)

---

## Next: After Verification

Once all checks pass:
1. Create vector index (separate task)
2. Implement `semantic_search()` RPC
3. Implement `hybrid_search()` RPC with geo + semantic ranking
