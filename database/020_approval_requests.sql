-- Migration 020: Approval Requests
-- Tracks membership applications requiring approval

CREATE TABLE IF NOT EXISTS public.approval_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id uuid REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
    plan_id uuid REFERENCES public.membership_plans(id) ON DELETE CASCADE NOT NULL,
    status text DEFAULT 'pending',
    reason text,
    requested_at timestamp with time zone DEFAULT now(),
    decided_at timestamp with time zone,
    decided_by uuid REFERENCES public.members(id),
    decision_notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read approval requests"
ON public.approval_requests
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow authenticated users read own requests"
ON public.approval_requests
FOR SELECT
TO authenticated
USING (member_id = auth.uid());

-- Index for efficient queries
CREATE INDEX idx_approval_requests_member_id ON public.approval_requests(member_id);
CREATE INDEX idx_approval_requests_status ON public.approval_requests(status);
CREATE INDEX idx_approval_requests_requested_at ON public.approval_requests(requested_at);