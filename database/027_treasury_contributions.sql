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
