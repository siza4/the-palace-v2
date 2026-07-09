-- Migration 025: Governance & Institutional Control System
-- Implements Charter Chapter 18. Three decision categories with different
-- approval requirements (18.8), routed through a fixed pipeline (18.9):
-- Proposal -> Review -> Impact Analysis -> Approval -> Implementation -> Documentation.
--
-- Note on thresholds: the Charter defines WHO reviews/approves each tier
-- but does not specify exact voting thresholds (e.g. how many Council
-- votes count as consensus for a Constitutional change). This migration
-- and its engine encode a specific, documented interpretation:
--   - Operational: no proposal record required — handled directly by the
--     relevant Office via existing permission-gated actions.
--   - Institutional: at least one supporting Council review + Authority approval.
--   - Constitutional: ALL currently active Council Office holders must
--     record a supporting review before Authority can approve.
-- These thresholds are a reasonable default, not a Charter mandate —
-- reconsider them once there's a real Council to consult.

CREATE TABLE IF NOT EXISTS public.governance_proposals (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    description text NOT NULL,
    category text NOT NULL CHECK (category IN ('institutional', 'constitutional')),
    proposed_by uuid REFERENCES public.members(id) NOT NULL,
    status text DEFAULT 'under_review', -- under_review | approved | rejected | implemented
    impact_analysis text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    implemented_at timestamp with time zone,
    documentation text -- filled in at the Documentation stage (18.9)
);

-- Council review step (18.5: "Evaluate proposals" / 18.9 Review stage).
-- One row per Council Office holder per proposal.
CREATE TABLE IF NOT EXISTS public.governance_reviews (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    proposal_id uuid REFERENCES public.governance_proposals(id) ON DELETE CASCADE NOT NULL,
    reviewer_id uuid REFERENCES public.members(id) NOT NULL,
    recommendation text NOT NULL CHECK (recommendation IN ('support', 'oppose', 'abstain')),
    comments text,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(proposal_id, reviewer_id)
);

-- Final Authority decision (18.6: "Approve critical changes" / 18.9 Approval stage).
CREATE TABLE IF NOT EXISTS public.governance_decisions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    proposal_id uuid REFERENCES public.governance_proposals(id) ON DELETE CASCADE NOT NULL UNIQUE,
    decided_by uuid REFERENCES public.members(id) NOT NULL,
    decision text NOT NULL CHECK (decision IN ('approved', 'rejected')),
    decision_notes text,
    decided_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.governance_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governance_decisions ENABLE ROW LEVEL SECURITY;

-- Proposals, reviews, and decisions are institutional record — visible to
-- any authenticated member (transparency of governance, Charter 18.12
-- Audit Governance), not just participants.
CREATE POLICY "Authenticated members read proposals"
ON public.governance_proposals FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated members read reviews"
ON public.governance_reviews FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated members read decisions"
ON public.governance_decisions FOR SELECT TO authenticated USING (true);

-- New permissions for the governance pipeline.
INSERT INTO public.permissions (name, description, category) VALUES
('propose_governance_change', 'Submit an institutional or constitutional governance proposal', 'admin'),
('review_governance_proposal', 'Record a Council review recommendation on a proposal', 'admin'),
('decide_governance_proposal', 'Approve or reject a governance proposal (Authority)', 'admin')
ON CONFLICT (name) DO NOTHING;

-- Council Office holders (via the Royal Council role) can propose and review.
-- Palace Authority can propose, review, and decide.
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.royal_roles r, public.permissions p
WHERE r.name = 'Royal Council' AND p.name IN ('propose_governance_change', 'review_governance_proposal')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.royal_roles r, public.permissions p
WHERE r.name = 'Palace Authority' AND p.name IN ('propose_governance_change', 'review_governance_proposal', 'decide_governance_proposal')
ON CONFLICT (role_id, permission_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_governance_proposals_status ON public.governance_proposals(status);
CREATE INDEX IF NOT EXISTS idx_governance_reviews_proposal_id ON public.governance_reviews(proposal_id);
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
-- Migration 027: The $1/Day Contribution Model (Charter Chapter 10)
--
-- Chapter 10 opens by saying it exists specifically to correct "the exact
-- problem we saw with the AI-generated membership engine" drifting toward
-- a SaaS model. That drift happened again in this codebase:
-- membership_plans sold 5 escalating tiers up to $299.99/month for
-- "Palace Authority" -- directly violating 10.6 ("The Palace does not use
-- typical software pricing tiers"), 10.8 ("Payment and Authority
-- Separation" -- Council/Authority Standing are explicitly "Not simply
-- purchased" / "Appointment only"), and the named anti-pattern list in
-- 21.8 ("Never implement: Basic Plan, Premium Plan, Gold Plan").
--
-- The real model (10.3, 10.6): a flat $1/day contribution that maintains
-- Member Standing. It is not a paywall tier system. Circle/Council/
-- Authority Standing are earned via lib/engine/standing.js's existing
-- review-gated advancement (already built correctly in migration 022) --
-- this migration does not touch that, only the payment side.
--
-- Per the safety principle of not destroying data: membership_plans and
-- subscriptions are deprecated, not dropped. Existing rows are preserved.

ALTER TABLE public.membership_plans ADD COLUMN IF NOT EXISTS deprecated boolean DEFAULT true;
UPDATE public.membership_plans SET deprecated = true;
COMMENT ON TABLE public.membership_plans IS
  'DEPRECATED as of migration 027. Charter 10.6 rejects tiered pricing plans entirely. Kept for historical/audit data only -- do not sell from this table. See treasury_contributions instead.';

DROP POLICY IF EXISTS "Public read of membership plans" ON public.membership_plans;
DROP POLICY IF EXISTS "Allow public read" ON public.membership_plans;

ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS deprecated boolean DEFAULT true;
UPDATE public.subscriptions SET deprecated = true;
COMMENT ON TABLE public.subscriptions IS
  'DEPRECATED as of migration 027. Replaced by treasury_contributions (Charter 10.3, $1/day model). Kept for historical/audit data only.';

-- The real economic model: flat-rate contributions that extend Member
-- Standing. Not tied to any plan_id.
CREATE TABLE IF NOT EXISTS public.treasury_contributions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id uuid REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
    days integer NOT NULL CHECK (days >= 1), -- 10.3: minimum contribution secures at least 1 day
    amount numeric(10,2) NOT NULL,
    currency text DEFAULT 'usd',
    daily_rate numeric(10,2) DEFAULT 1.00, -- 10.3: the $1/day principle, kept configurable not hardcoded
    status text DEFAULT 'pending', -- pending | confirmed | failed | refunded
    stripe_payment_intent_id text,
    member_note text,
    created_at timestamp with time zone DEFAULT now(),
    confirmed_at timestamp with time zone
);

ALTER TABLE public.treasury_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read their own contributions"
ON public.treasury_contributions FOR SELECT TO authenticated
USING (member_id IN (SELECT id FROM public.members WHERE email = auth.jwt() ->> 'email'));

-- Standing needs an expiry concept now that it's contribution-maintained
-- rather than subscription-maintained (10.9: Active -> Renewal Required
-- -> Suspended). member_standing already exists (migration 022) --
-- extending it rather than creating a parallel table, since Standing
-- expiry is a property of Standing, not a separate concept.
ALTER TABLE public.member_standing ADD COLUMN IF NOT EXISTS contribution_expires_at timestamp with time zone;

COMMENT ON COLUMN public.member_standing.contribution_expires_at IS
  'Charter 10.9: when continued contribution lapses, Standing moves toward Renewal Required / Suspended -- it does not disappear immediately. NULL means no contribution-based expiry applies (e.g. appointed Authority/Council Standing, which per 10.6 is never purchased and does not lapse on non-payment).';

CREATE INDEX IF NOT EXISTS idx_treasury_contributions_member_id ON public.treasury_contributions(member_id);
CREATE INDEX IF NOT EXISTS idx_treasury_contributions_status ON public.treasury_contributions(status);
