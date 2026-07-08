-- Migration 021: Alter Members Table
-- Add subscription and membership references to members

ALTER TABLE public.members
ADD COLUMN IF NOT EXISTS subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS membership_plan_id uuid REFERENCES public.membership_plans(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS access_level integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS membership_status text DEFAULT 'pending';

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_members_access_level ON public.members(access_level);
CREATE INDEX IF NOT EXISTS idx_members_membership_status ON public.members(membership_status);