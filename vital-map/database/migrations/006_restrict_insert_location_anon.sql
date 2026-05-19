-- Migration 006: Restrict insert_location to authenticated; tighten reviews INSERT bounds
-- Date: 2026-05-19
-- Idempotent.

BEGIN;

-- 1. Revoke insert_location from anon (D1)
REVOKE EXECUTE ON FUNCTION insert_location(text, text, text, text, text, text, text, vector) FROM anon;

-- 2. Replace reviews_insert_public policy with a CHECK-bounded version (D2)
DROP POLICY IF EXISTS "reviews_insert_public" ON reviews;
CREATE POLICY "reviews_insert_public"
    ON reviews
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (
      rating BETWEEN 1 AND 5
      AND (comment IS NULL OR length(comment) <= 2000)
    );

COMMIT;
