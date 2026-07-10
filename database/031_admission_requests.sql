-- Migration 031: Admission Requests (reviewed admission lifecycle)
--
-- Implements: Applicant -> Admission Request -> Admissions/Butler Review
-- -> Authority Decision -> Member Created -> Royal Pass -> Standing ->
-- Contribution Verification -> Full Access.
--
-- Replaces the instant-approval behavior in app/api/admission/route.js
-- (which created a member directly on submission). Does NOT touch or
-- drop approval_requests (legacy, FK'd to membership_plans) — that
-- table is left alone as documented legacy, per Phase 5.
--
-- No anon INSERT/SELECT/UPDATE policy is created on this table. Every
-- access path is a service-role API route (see app/api/admission/route.js
-- and app/api/butler/admission-requests/**), matching the pattern
-- already used by governance_proposals, standing advancement requests,
-- and treasury contributions. An applicant has no session at submission
-- time, so there's no meaningful RLS policy to scope to them anyway.

CREATE TABLE IF NOT EXISTS public.admission_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name text NOT NULL,
    email text NOT NULL,
    phone text,
    country text,
    status text NOT NULL DEFAULT 'submitted',
    -- submitted -> recommended | declined_by_admissions -> approved | rejected
    reviewed_by uuid REFERENCES public.members(id),
    review_recommendation text, -- 'accept' | 'reject' | 'request_info'
    review_notes text,
    reviewed_at timestamp with time zone,
    decided_by uuid REFERENCES public.members(id),
    decision text, -- 'approved' | 'rejected'
    decision_notes text,
    decided_at timestamp with time zone,
    member_id uuid REFERENCES public.members(id), -- set once approved & member created
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.admission_requests ENABLE ROW LEVEL SECURITY;
-- No policies created — intentional. See note above.

CREATE INDEX IF NOT EXISTS idx_admission_requests_status ON public.admission_requests(status);
CREATE INDEX IF NOT EXISTS idx_admission_requests_email ON public.admission_requests(email);

-- Two new permissions, separate from the legacy approve_membership
-- (which stays tied to the old plan-based approval_requests flow and is
-- not reused here, to avoid overloading one permission across two
-- different, differently-shaped workflows).
INSERT INTO public.permissions (name, description, category)
VALUES ('review_admission_request', 'Inspect and recommend accept/reject on an admission request', 'member_management')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.permissions (name, description, category)
VALUES ('decide_admission_request', 'Final approve/reject an admission request; creates the Member on approval', 'member_management')
ON CONFLICT (name) DO NOTHING;

-- Grants: Royal Council and Palace Authority can review (Admissions
-- Office / Butler's Office function). Only Palace Authority can decide.
-- Per the approved gating model, Permission alone is NOT sufficient at
-- the application layer — the new API routes additionally require the
-- acting member to hold the relevant Office (Admissions Office or
-- Butler's Office to review; Authority Office to decide). That Office
-- check is enforced in code (lib/auth/permissions.js:
-- hasPermissionAndOffice()), not in RLS, matching how this schema
-- enforces every other privileged action.
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.royal_roles r, public.permissions p
WHERE r.name = 'Royal Council' AND p.name = 'review_admission_request'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.royal_roles r, public.permissions p
WHERE r.name = 'Palace Authority' AND p.name IN ('review_admission_request', 'decide_admission_request')
ON CONFLICT (role_id, permission_id) DO NOTHING;
