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
