-- Migration 017: Membership Plans
-- Creates the foundation for tiered membership offerings

CREATE TABLE IF NOT EXISTS public.membership_plans (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text UNIQUE NOT NULL,
    description text,
    price numeric(10, 2),
    billing_period text DEFAULT 'month',
    access_level integer DEFAULT 1,
    requires_approval boolean DEFAULT false,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read membership plans"
ON public.membership_plans
FOR SELECT
TO anon
USING (active = true);

-- Insert default membership tiers
INSERT INTO public.membership_plans
(name, description, price, billing_period, access_level, requires_approval, active)
VALUES
('Royal Visitor', 'Browse and observe The Palace', 0.00, 'lifetime', 1, false, true),
('Royal Member', 'Full member access to chambers and announcements', 9.99, 'month', 2, false, true),
('Royal Circle', 'Inner circle access with special privileges', 29.99, 'month', 3, true, true),
('Royal Council', 'Council authority and decision-making power', 99.99, 'month', 4, true, true),
('Palace Authority', 'Full administrative control', 299.99, 'month', 5, true, true);