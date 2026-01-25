# PostGIS to Mapbox Integration - Deployment Guide

## Implementation Summary

This feature branch connects the PostGIS database to the Mapbox frontend, removing mock data and enabling real location data display.

### Changes Made

#### 1. Database Function (`database/functions/get_all_locations.sql`)
- Created `get_all_locations()` RPC function
- Converts PostGIS `geometry(Point, 4326)` to text format using `ST_AsText(geom)`
- Returns format: `"POINT(lng lat)"` compatible with frontend parser

#### 2. Type Updates (`vital-map/web/types/resource.ts`)
- Changed `id` from `string` to `number` (matches database bigint)
- Made `semantic_vector` optional (not all locations may have embeddings)
- Added `website_url` and `created_at` fields from database schema

#### 3. Frontend Integration (`vital-map/web/hooks/useResources.ts`)
- Removed mock data import
- Updated `useEffect` to call `get_all_locations()` RPC on mount
- Removed fallback to mock data in all functions
- All errors now log and return empty arrays

#### 4. Component Fixes (`vital-map/web/components/MapView.tsx`)
- Fixed ID sorting to use numeric comparison instead of string
- Component already uses `parsePostGISPoint()` for coordinate parsing

#### 5. Cleanup
- Deleted `vital-map/web/lib/mockData.ts`

## Deployment Steps

### Step 1: Apply Database Function

**Option A: Supabase SQL Editor (Recommended)**

1. Open https://supabase.com/dashboard/project/izkjkpnozgqcmqgfhixv/sql
2. Click "New Query"
3. Copy contents from `database/functions/get_all_locations.sql`
4. Click "Run" or press Cmd/Ctrl + Enter
5. Verify success message

**Option B: Using psql (if available)**

```bash
psql "postgresql://postgres.izkjkpnozgqcmqgfhixv@db.izkjkpnozgqcmqgfhixv.supabase.co:5432/postgres" \
  -f vital-map/database/functions/get_all_locations.sql
```

### Step 2: Verify Database Has Data

Ensure the `locations` table has data. If not, run the seed file:

1. Open Supabase SQL Editor
2. Copy contents from `database/seeds/001_mock_data.sql`
3. Run the SQL

This will insert 10 sample locations in the LA area.

### Step 3: Test the Integration

```bash
cd vital-map/web
npm run dev
```

Open http://localhost:3000 and verify:
- Map loads centered on Los Angeles
- Location markers appear on the map
- No console errors about missing RPC function
- Clicking markers shows location details

### Step 4: Merge to Main

Once verified:

```bash
git checkout main
git merge feature/postgis-mapbox-integration
git push origin main
```

## Verification Checklist

- [ ] Database function `get_all_locations()` created successfully
- [ ] Database has location data (run seeds if needed)
- [ ] Dev server starts without errors
- [ ] Map displays markers for all locations
- [ ] Console shows "✅ Loaded N locations from database"
- [ ] No errors about missing `mockResources`
- [ ] Clicking markers displays correct location info
- [ ] Coordinates match LA area (lng: -118.x, lat: 34.x)

## Rollback Plan

If issues occur:

```bash
git checkout main
git branch -D feature/postgis-mapbox-integration
```

Then restore mock data if needed.

## Architecture Notes

### Data Flow

1. **Database**: `locations` table with `geom geometry(Point, 4326)` column
2. **RPC Function**: `get_all_locations()` converts to `ST_AsText(geom)` → `"POINT(lng lat)"`
3. **Frontend Hook**: `useResources` calls `supabase.rpc('get_all_locations')`
4. **Type System**: `Resource` interface with `location: string`
5. **Map Component**: Parses with `parsePostGISPoint()` → `[lng, lat]` array
6. **Mapbox**: Creates markers using `[lng, lat]` coordinates

### Coordinate Format Journey

```
Database: ST_Point(-118.2437, 34.0522, 4326)
   ↓ ST_AsText()
RPC Response: "POINT(-118.2437 34.0522)"
   ↓ parsePostGISPoint()
Frontend: [-118.2437, 34.0522]
   ↓ Mapbox GL JS
Map Marker: LngLat(-118.2437, 34.0522)
```

## Next Steps

After successful deployment:

1. Implement `match_locations()` RPC for bounding box queries
2. Implement `semantic_search()` RPC for vector similarity search
3. Add real OpenAI embeddings to location data
4. Implement `get_happening_now_events()` for temporal resources
5. Add user authentication and RLS policies
