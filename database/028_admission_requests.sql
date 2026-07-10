-- Migration 028: Admission Requests (Milestone 2, Part A)
--
-- Introduces a dedicated admissions workflow, separate from members.status.
-- An applicant is NOT a member. No row here creates an identity by itself —
-- identity, Royal Pass, and Standing are only created by the approval
-- engine (lib/engine/admission.js decideAdmission()) after a Butler with
-- the approve_membership permission approves the request. This preserves
-- Charter 12.x: identity does not exist before approval.
--
-- Status flow: submitted -> under_review -> approved | rejected
-- withdrawn is available for an applicant-initiated cancellation, though
-- no UI calls it yet (no applicant-facing session exists at this stage).

CREATE TABLE IF NOT EXISTS public.admission_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Applicant-submitted fields. Deliberately NOT a members row/FK —
    -- the applicant has no member_id yet.
    full_name text NOT NULL,
    email text NOT NULL,
    phone text,
    country text,
    applicant_notes text,

    status text NOT NULL DEFAULT 'submitted',

    -- Butler Investigation stage (Part C)
    review_notes text,
    reviewed_by uuid REFERENCES public.members(id),
    reviewed_at timestamp with time zone,

    -- Decision stage (Part D)
    decided_by uuid REFERENCES public.members(id),
    decided_at timestamp with time zone,
    decision_reason text,

    -- Set only on approval, once createMember() actually runs.
    created_member_id uuid REFERENCES public.members(id),

    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),

    CONSTRAINT admission_requests_status_check
        CHECK (status IN ('submitted', 'under_review', 'approved', 'rejected', 'withdrawn'))
);

-- Automatic validation, stage one of the two-stage review (Charter-aligned:
-- the Butler judges suitability, not malformed/duplicate forms). One active
-- application per email at a time; a rejected or withdrawn applicant may
-- re-apply, an approved one is already a member and shouldn't re-apply.
CREATE UNIQUE INDEX IF NOT EXISTS idx_admission_requests_email_active
ON public.admission_requests (email)
WHERE status IN ('submitted', 'under_review');

CREATE INDEX IF NOT EXISTS idx_admission_requests_status
ON public.admission_requests(status);

CREATE INDEX IF NOT EXISTS idx_admission_requests_created_at
ON public.admission_requests(created_at);

ALTER TABLE public.admission_requests ENABLE ROW LEVEL SECURITY;

-- No anon or authenticated policies are defined: every read/write on this
-- table goes through lib/engine/admission.js using the service-role key
-- from server-only API routes (app/api/admission/**). Visitors never touch
-- Supabase directly for admissions, so there is nothing for RLS to allow —
-- only the service role, which bypasses RLS, can reach this table. This is
-- deliberately more restrictive than approval_requests (020), which is
-- legacy and unused.
