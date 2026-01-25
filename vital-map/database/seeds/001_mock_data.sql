-- Seed: Mock Data for Vital Map
-- Description: Sample locations and reviews for testing
-- Date: 2026-01-24
--
-- Usage: Paste this into Supabase SQL Editor or run via psql
--
-- PASTE YOUR SEED DATA BELOW THIS LINE
-- --------------------------------------------

-- Clear existing data first (reviews auto-deleted due to CASCADE)
TRUNCATE TABLE locations RESTART IDENTITY CASCADE;

-- Insert 10 realistic LA/SoCal demo locations with mock embeddings
-- Note: Mock embeddings use simple patterns. Replace with real OpenAI embeddings in production.
INSERT INTO locations (name, category, description, website_url, geom, embedding) VALUES
('LA Mutual Aid Network', 'mutual_aid', 'Community resource sharing in Los Angeles.', 'https://www.mutualaidhub.org', ST_SetSRID(ST_MakePoint(-118.2437, 34.0522), 4326), array_fill(0.100::real, ARRAY[1536])::vector(1536)),
('Pure Land Farms', 'spiritual_center', 'Tibetan medicine and holistic health retreats.', 'https://purelandfarms.com', ST_SetSRID(ST_MakePoint(-117.1231, 33.1358), 4326), array_fill(-0.100::real, ARRAY[1536])::vector(1536)),
('Urban Farm Collective LA', 'farm', 'Community urban agriculture in South LA.', 'https://www.freedomcommunityclinic.org', ST_SetSRID(ST_MakePoint(-118.2903, 33.9688), 4326), array_fill(0.300::real, ARRAY[1536])::vector(1536)),
('Ancestral Healing LA', 'healer', 'BIPOC-led herbal medicine and energy healing.', 'https://www.freedomcommunityclinic.org/ancestral-healing-farm', ST_SetSRID(ST_MakePoint(-118.2437, 34.0522), 4326), array_fill(0.200::real, ARRAY[1536])::vector(1536)),
('LA Tenants Union', 'mutual_aid', 'Housing justice and mutual aid for renters.', 'https://tenantsunion.org', ST_SetSRID(ST_MakePoint(-118.2353, 34.0254), 4326), array_fill(0.102::real, ARRAY[1536])::vector(1536)),
('Echo Park Mutual Aid', 'mutual_aid', 'Neighborhood food distribution and wellness checks.', 'https://www.mutualaidhub.org', ST_SetSRID(ST_MakePoint(-118.2567, 34.0763), 4326), array_fill(0.101::real, ARRAY[1536])::vector(1536)),
('South LA Community Garden', 'ecological_steward', 'Urban farming and environmental education.', 'https://www.lacity.org/garden', ST_SetSRID(ST_MakePoint(-118.2903, 33.9688), 4326), array_fill(-0.200::real, ARRAY[1536])::vector(1536)),
('Venice Beach Healers Circle', 'healer', 'Beachside acupuncture and massage practitioners.', 'https://venicehealers.com', ST_SetSRID(ST_MakePoint(-118.4695, 33.9850), 4326), array_fill(0.201::real, ARRAY[1536])::vector(1536)),
('Highland Park Wellness Center', 'spiritual_center', 'Yoga, meditation, and sound healing studio.', 'https://highlandparkwellness.com', ST_SetSRID(ST_MakePoint(-118.2142, 34.1186), 4326), array_fill(-0.101::real, ARRAY[1536])::vector(1536)),
('Compton Mutual Aid Farm', 'farm', 'Urban farm providing fresh produce to the community.', 'https://www.mutualaidhub.org', ST_SetSRID(ST_MakePoint(-118.2203, 33.8958), 4326), array_fill(0.301::real, ARRAY[1536])::vector(1536));

-- Add some sample reviews
INSERT INTO reviews (location_id, rating, comment) VALUES
(1, 5, 'Amazing community support! They helped me get food and supplies during a tough time.'),
(1, 4, 'Great resource network, very responsive volunteers.'),
(2, 5, 'Life-changing retreat. The Tibetan medicine practices are incredible.'),
(3, 5, 'Fresh vegetables every week! Love supporting local urban farming.'),
(3, 4, 'Great educational programs for kids about sustainable agriculture.'),
(4, 5, 'The herbal remedies and energy healing sessions were transformative.'),
(5, 5, 'Successfully fought my eviction with their help. Forever grateful.'),
(6, 4, 'Reliable food distribution every Saturday. Community really shows up.'),
(7, 5, 'My kids learned so much about growing food in the city.'),
(8, 5, 'Best beachside acupuncture in LA. Very skilled practitioners.'),
(9, 4, 'Beautiful space for meditation and yoga. Great sound healing sessions.'),
(10, 5, 'Free fresh produce for seniors in the community. Such a blessing.');
