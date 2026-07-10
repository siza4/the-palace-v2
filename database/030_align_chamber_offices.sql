-- Migration 030: Align chamber.required_office with real Office names
--
-- LIVE-DATA ASSUMPTION (unverified): I do not have your live
-- `SELECT id, name, required_office FROM chambers;` output. This
-- migration is derived entirely from what's provable in code:
--   - chambers.required_office defaults to 'Royal Member'
--     (database/013_royal_chambers.sql)
--   - the only real Office names are: 'Royal Member Office',
--     'Council Office', 'Admissions Office', 'Treasury Office',
--     "Butler's Office", 'Authority Office' (database/023_offices.sql)
--   - memberHoldsOffice() (lib/engine/offices.js) does an exact string
--     match against offices.name
--   - no chamber seed data is committed to any migration, so I cannot
--     know every value that might be live
--
-- This migration only touches the two specific stale values that are
-- provable from code (the column default, and the report's claim about
-- a 'Royal Council' value, which does not exist in offices — that name
-- exists only as a Role in royal_roles). It intentionally does NOT
-- attempt to "fix everything" blindly.
--
-- RUN THE VERIFICATION QUERY BELOW FIRST. If it returns any
-- required_office value other than 'Royal Member' or 'Royal Council',
-- STOP and send me the output — this migration does not cover that case
-- and a blind guess could misconfigure Chamber access.

-- Run first, inspect the output:
-- SELECT id, name, required_office FROM public.chambers;

UPDATE public.chambers
SET required_office = 'Royal Member Office'
WHERE required_office = 'Royal Member';

UPDATE public.chambers
SET required_office = 'Council Office'
WHERE required_office = 'Royal Council';

-- Run again after, confirm every required_office value now matches a
-- real row in offices.name exactly:
-- SELECT c.id, c.name, c.required_office,
--        (o.name IS NOT NULL) AS matches_a_real_office
-- FROM public.chambers c
-- LEFT JOIN public.offices o ON o.name = c.required_office;
