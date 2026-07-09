-- Migration 004: Activity Logs (RECONSTRUCTED — see note in 001_members.sql)
-- Reconstructed from lib/engine/activity.js usage. This is the audit-trail
-- table the Charter (21.13) requires behind every sensitive action.

CREATE TABLE IF NOT EXISTS public.activity_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
    action text NOT NULL,
    description text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- No public read policy — activity logs are an internal audit trail.
-- Access is service-role only (Butler's Office tooling), never anon/authenticated.

CREATE INDEX IF NOT EXISTS idx_activity_logs_member_id ON public.activity_logs(member_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON public.activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at);
