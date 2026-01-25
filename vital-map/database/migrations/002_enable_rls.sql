-- Migration: Enable Row Level Security (RLS)
-- Description: Set up RLS policies for locations and reviews tables
-- Date: 2026-01-24

-- Enable RLS on both tables
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- ============================================
-- LOCATIONS TABLE POLICIES
-- ============================================

-- Allow everyone (anon + authenticated) to SELECT locations
CREATE POLICY "locations_select_public"
    ON locations
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- No INSERT/UPDATE/DELETE policies = denied by default

-- ============================================
-- REVIEWS TABLE POLICIES
-- ============================================

-- Allow everyone (anon + authenticated) to SELECT reviews
CREATE POLICY "reviews_select_public"
    ON reviews
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Allow everyone (anon + authenticated) to INSERT reviews
CREATE POLICY "reviews_insert_public"
    ON reviews
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- No UPDATE/DELETE policies = denied by default

-- ============================================
-- VERIFICATION QUERIES (optional - run separately)
-- ============================================

-- To verify RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename IN ('locations', 'reviews');

-- To view all policies:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename IN ('locations', 'reviews');
