-- Migration 022: Royal Standing System
-- Implements Charter Vol II Ch5 / Vol II Ch12 (§12.14 "The Golden Membership Rule":
-- Membership creates belonging. Standing creates recognition. Offices create
-- responsibility. Never combine these into one simple "role" field.)
--
-- This is deliberately independent of membership_plans/subscriptions.
-- membership_plans/access_level = what you're paying for (product/Chamber access).
-- standing = your earned institutional relationship (Visitor/Member/Circle/
-- Council/Authority), which per §12.10 advances on
-- Contribution + Time + Trust + Responsibility — never on payment alone.

CREATE TABLE IF NOT EXISTS public.standing_levels (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text UNIQUE NOT NULL,
    rank integer UNIQUE NOT NULL, -- ordering only, not a numeric "power level"
    description text,
    auto_grantable boolean DEFAULT false, -- true only for Visitor/Member (§12.4)
    created_at timestamp with time zone DEFAULT now()
);

INSERT INTO public.standing_levels (name, rank, description, auto_grantable) VALUES
('Visitor Standing', 0, 'Discovered The Palace but has not entered membership. Views the entrance, not the institution.', true),
('Member Standing', 1, 'The foundation. First recognised relationship — Royal Identity, Throne, Member Chambers, official communication.', true),
('Circle Standing', 2, 'Deeper participation, considering continued membership, contribution history, participation quality, institutional trust.', false),
('Council Standing', 3, 'Institutional responsibility. Requires history, demonstrated responsibility, and appointment approval — never purchased.', false),
('Authority Standing', 4, 'Institutional guardianship. Requires appointment, trust, proven responsibility, and understanding of the Charter.', false)
ON CONFLICT (name) DO NOTHING;

-- A member's current Standing. One row per member — Standing is a state,
-- not a log (history lives in standing_history below).
CREATE TABLE IF NOT EXISTS public.member_standing (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id uuid REFERENCES public.members(id) ON DELETE CASCADE NOT NULL UNIQUE,
    standing_level_id uuid REFERENCES public.standing_levels(id) NOT NULL,
    status text DEFAULT 'active', -- active, suspended (§12.12 — preserves history, not deletion)
    granted_at timestamp with time zone DEFAULT now(),
    granted_by uuid REFERENCES public.members(id), -- null when auto-granted (Visitor/Member)
    grant_method text DEFAULT 'automatic', -- automatic | review | appointment
    notes text,
    updated_at timestamp with time zone DEFAULT now()
);

-- Full history of Standing changes — grants, suspensions, restorations.
-- Distinct from activity_logs: this is the institutional record of the
-- relationship itself (§12.4 "Institutional History"), not a generic action log.
CREATE TABLE IF NOT EXISTS public.standing_history (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id uuid REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
    from_standing_id uuid REFERENCES public.standing_levels(id),
    to_standing_id uuid REFERENCES public.standing_levels(id) NOT NULL,
    change_type text NOT NULL, -- granted | advanced | suspended | restored
    changed_by uuid REFERENCES public.members(id),
    reason text,
    created_at timestamp with time zone DEFAULT now()
);

-- Requests to advance Standing (Circle/Council/Authority). Deliberately
-- separate from approval_requests (which governs membership_plans/product
-- access) — Standing advancement is a Charter-governed institutional
-- decision, not a plan upgrade, even though both flow through review.
CREATE TABLE IF NOT EXISTS public.standing_advancement_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id uuid REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
    requested_standing_id uuid REFERENCES public.standing_levels(id) NOT NULL,
    reason text,
    status text DEFAULT 'pending', -- pending | approved | rejected
    requested_at timestamp with time zone DEFAULT now(),
    decided_at timestamp with time zone,
    decided_by uuid REFERENCES public.members(id),
    decision_notes text
);

ALTER TABLE public.standing_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_standing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.standing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.standing_advancement_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read of standing levels"
ON public.standing_levels FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Members read their own standing"
ON public.member_standing FOR SELECT TO authenticated
USING (member_id IN (SELECT id FROM public.members WHERE email = auth.jwt() ->> 'email'));

CREATE POLICY "Members read their own standing history"
ON public.standing_history FOR SELECT TO authenticated
USING (member_id IN (SELECT id FROM public.members WHERE email = auth.jwt() ->> 'email'));

CREATE POLICY "Members read their own advancement requests"
ON public.standing_advancement_requests FOR SELECT TO authenticated
USING (member_id IN (SELECT id FROM public.members WHERE email = auth.jwt() ->> 'email'));

-- New permission specifically for Standing decisions — distinct from
-- approve_membership (plan/product access), per the Golden Membership Rule.
INSERT INTO public.permissions (name, description, category)
VALUES ('manage_standing', 'Grant, advance, suspend, or restore a member''s Standing', 'member_management')
ON CONFLICT (name) DO NOTHING;

-- Only Palace Authority holds this by default — matches §7.29 "Authority
-- Standing... requires appointment, trust, proven responsibility."
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.royal_roles r, public.permissions p
WHERE r.name = 'Palace Authority' AND p.name = 'manage_standing'
ON CONFLICT (role_id, permission_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_member_standing_member_id ON public.member_standing(member_id);
CREATE INDEX IF NOT EXISTS idx_standing_history_member_id ON public.standing_history(member_id);
CREATE INDEX IF NOT EXISTS idx_standing_advancement_status ON public.standing_advancement_requests(status);
