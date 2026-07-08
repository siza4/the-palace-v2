-- Migration 018: Subscriptions
-- Tracks member subscriptions to membership plans

CREATE TABLE IF NOT EXISTS public.subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id uuid REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
    plan_id uuid REFERENCES public.membership_plans(id) ON DELETE RESTRICT NOT NULL,
    status text DEFAULT 'pending',
    started_at timestamp with time zone,
    expires_at timestamp with time zone,
    payment_status text DEFAULT 'unpaid',
    stripe_subscription_id text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read subscriptions"
ON public.subscriptions
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow authenticated users read own subscriptions"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (member_id = auth.uid());

-- Index for common queries
CREATE INDEX idx_subscriptions_member_id ON public.subscriptions(member_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_expires_at ON public.subscriptions(expires_at);