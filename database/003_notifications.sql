-- Migration 003: Notifications (RECONSTRUCTED — see note in 001_members.sql)
-- Reconstructed from lib/engine/notifications.js usage.

CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id uuid REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    message text,
    type text DEFAULT 'system',
    priority text DEFAULT 'normal',
    icon text DEFAULT '🔔',
    action_url text,
    read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read their own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
    member_id IN (SELECT id FROM public.members WHERE email = auth.jwt() ->> 'email')
);

CREATE INDEX IF NOT EXISTS idx_notifications_member_id ON public.notifications(member_id);
