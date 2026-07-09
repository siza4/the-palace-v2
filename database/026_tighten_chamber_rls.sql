-- Migration 026: Tighten Chamber RLS
-- Migration 013 gave 'anon' blanket SELECT on chambers and member_chambers.
-- That meant anyone could query Supabase directly (bypassing the app
-- entirely, using only the public anon key) and see which Chambers exist
-- and which members belong to them. Lower severity than the legal-identity
-- leaks fixed earlier (no personal data involved), but still an
-- unintended-audience exposure, found while wiring real Chamber access
-- enforcement.
--
-- New policy: chamber *definitions* (name/description/required_office)
-- stay public — that's fine, it's institutional information, not member
-- data. member_chambers (who belongs to what) becomes authenticated-only,
-- and further limited to a member's own rows.

DROP POLICY IF EXISTS "Allow public read member chambers" ON public.member_chambers;

CREATE POLICY "Members read their own chamber memberships"
ON public.member_chambers
FOR SELECT
TO authenticated
USING (
    member_id IN (SELECT id FROM public.members WHERE email = auth.jwt() ->> 'email')
);

-- The application's API routes (e.g. /api/chamber/[id]) use the
-- service-role client for the actual access-control decision, so this
-- does not break the enforcement built in migration 023 — it only closes
-- the direct-to-Supabase anon read path that bypassed the app.
