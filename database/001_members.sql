-- Migration 001: Members (RECONSTRUCTED)
-- The original 001_members.sql committed to the repo was empty (0 bytes).
-- This table clearly exists and is in active use (queried throughout
-- lib/services/member.service.js, lib/engine/admission.js, entry.js, etc.)
-- so it was almost certainly created directly via the Supabase dashboard
-- rather than through a committed migration. Reconstructed here from
-- observed application usage so the schema is reproducible from source.
--
-- If your live schema differs from this, run:
--   pg_dump --schema-only -t members <connection>
-- and reconcile before applying.

CREATE TABLE IF NOT EXISTS public.members (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    royal_id text UNIQUE NOT NULL,
    full_name text NOT NULL,
    email text UNIQUE NOT NULL,
    phone text,
    country text,
    membership_level text DEFAULT 'Citizen',
    status text DEFAULT 'Pending',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Public reads are limited to what later migrations (see 021, and the
-- application-layer PUBLIC_FIELDS selection in app/identity/[id]/page.js)
-- treat as safe. RLS here intentionally does NOT grant blanket anon SELECT --
-- full_name and email are legal identity per the Charter Appendix and must
-- stay server-side / service-role only.
CREATE POLICY "Members can read their own record"
ON public.members
FOR SELECT
TO authenticated
USING (auth.jwt() ->> 'email' = email);

CREATE INDEX IF NOT EXISTS idx_members_royal_id ON public.members(royal_id);
CREATE INDEX IF NOT EXISTS idx_members_email ON public.members(email);
