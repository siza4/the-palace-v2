-- Migration 002: Royal Passes (RECONSTRUCTED — see note in 001_members.sql)
-- Reconstructed from lib/services/pass.service.js usage.

CREATE TABLE IF NOT EXISTS public.royal_passes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id uuid REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
    qr_data text NOT NULL,
    barcode_data text NOT NULL,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.royal_passes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read their own pass"
ON public.royal_passes
FOR SELECT
TO authenticated
USING (
    member_id IN (SELECT id FROM public.members WHERE email = auth.jwt() ->> 'email')
);

CREATE INDEX IF NOT EXISTS idx_royal_passes_member_id ON public.royal_passes(member_id);
