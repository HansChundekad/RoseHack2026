-- Function: insert_location
-- Description: Secure RPC for inserting/upserting locations
-- Uses SECURITY DEFINER to bypass RLS while validating inputs
-- Returns: location ID (existing or newly created)
-- Date: 2026-01-25

-- Drop existing function if signature changed
DROP FUNCTION IF EXISTS insert_location(text, text, text, text, text, text, text, vector);

CREATE OR REPLACE FUNCTION insert_location(
  p_name text,
  p_category text,
  p_description text,
  p_website_url text,
  p_address text,
  p_phone_number text,
  p_geom text,  -- WKT format: "POINT(lon lat)"
  p_embedding vector(1536) DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER  -- Runs with function owner privileges (bypasses RLS safely)
SET search_path = public, extensions  -- Include extensions schema for PostGIS
AS $$
DECLARE
  v_location_id bigint;
  v_lon double precision;
  v_lat double precision;
BEGIN
  -- ============================================
  -- INPUT VALIDATION
  -- ============================================

  -- Validate required fields are not empty
  IF p_name IS NULL OR trim(p_name) = '' THEN
    RAISE EXCEPTION 'name is required and cannot be empty';
  END IF;

  IF p_category IS NULL OR trim(p_category) = '' THEN
    RAISE EXCEPTION 'category is required and cannot be empty';
  END IF;

  IF p_website_url IS NULL OR trim(p_website_url) = '' THEN
    RAISE EXCEPTION 'website_url is required and cannot be empty';
  END IF;

  IF p_address IS NULL OR trim(p_address) = '' THEN
    RAISE EXCEPTION 'address is required and cannot be empty';
  END IF;

  IF p_geom IS NULL OR trim(p_geom) = '' THEN
    RAISE EXCEPTION 'geom is required and cannot be empty';
  END IF;

  -- Validate WKT POINT format and extract coordinates
  IF NOT (p_geom ~* '^POINT\s*\(\s*-?[0-9]+\.?[0-9]*\s+-?[0-9]+\.?[0-9]*\s*\)$') THEN
    RAISE EXCEPTION 'Invalid geom format. Expected POINT(lon lat), got: %', p_geom;
  END IF;

  -- Extract lon/lat from POINT(lon lat) string
  v_lon := (regexp_matches(p_geom, 'POINT\s*\(\s*(-?[0-9]+\.?[0-9]*)'))[1]::double precision;
  v_lat := (regexp_matches(p_geom, 'POINT\s*\(\s*-?[0-9]+\.?[0-9]*\s+(-?[0-9]+\.?[0-9]*)'))[1]::double precision;

  -- Validate coordinate ranges
  IF v_lon < -180 OR v_lon > 180 THEN
    RAISE EXCEPTION 'longitude must be between -180 and 180, got: %', v_lon;
  END IF;

  IF v_lat < -90 OR v_lat > 90 THEN
    RAISE EXCEPTION 'latitude must be between -90 and 90, got: %', v_lat;
  END IF;

  -- Validate embedding dimensions if provided
  IF p_embedding IS NOT NULL AND array_length(p_embedding::real[], 1) != 1536 THEN
    RAISE EXCEPTION 'embedding must have exactly 1536 dimensions, got: %',
      array_length(p_embedding::real[], 1);
  END IF;

  -- ============================================
  -- UPSERT LOGIC (Idempotent insert)
  -- ============================================

  INSERT INTO locations (
    name,
    category,
    description,
    website_url,
    address,
    phone_number,
    geom,
    embedding
  ) VALUES (
    trim(p_name),
    trim(p_category),
    NULLIF(trim(COALESCE(p_description, '')), ''),
    trim(p_website_url),
    trim(p_address),
    NULLIF(trim(COALESCE(p_phone_number, '')), ''),
    ST_SetSRID(ST_MakePoint(v_lon, v_lat), 4326),
    p_embedding
  )
  ON CONFLICT (website_url) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    address = EXCLUDED.address,
    phone_number = EXCLUDED.phone_number,
    geom = EXCLUDED.geom,
    embedding = COALESCE(EXCLUDED.embedding, locations.embedding)
    -- Note: Preserves existing embedding if new one is NULL
    -- Note: website_url and created_at are NOT updated
  RETURNING id INTO v_location_id;

  RETURN v_location_id;
END;
$$;

-- Grant execute permission to authenticated and anon users
-- The function uses SECURITY DEFINER so it runs with owner privileges
-- This is safe because all inputs are validated inside the function
GRANT EXECUTE ON FUNCTION insert_location(text, text, text, text, text, text, text, vector) TO authenticated;
GRANT EXECUTE ON FUNCTION insert_location(text, text, text, text, text, text, text, vector) TO anon;

-- Add documentation
COMMENT ON FUNCTION insert_location(text, text, text, text, text, text, text, vector) IS
  'Secure RPC for inserting/upserting locations. Uses SECURITY DEFINER to bypass RLS safely. '
  'Validates all inputs. Idempotent: reruns with same website_url update existing row. '
  'Returns location ID (existing or new). Preserves existing embedding if new one is NULL.';
