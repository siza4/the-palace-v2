-- Migration 005: Member Profiles (RECONSTRUCTED — see note in 001_members.sql)
-- Reconstructed from lib/services/profile.service.js and lib/engine/profile.js.

CREATE TABLE IF NOT EXISTS public.member_profiles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id uuid REFERENCES public.members(id) ON DELETE CASCADE NOT NULL UNIQUE,
    display_name text,
    royal_title text DEFAULT 'Citizen',
    bio text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.member_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read of display profile fields"
ON public.member_profiles
FOR SELECT
TO anon, authenticated
USING (true);

CREATE INDEX IF NOT EXISTS idx_member_profiles_member_id ON public.member_profiles(member_id);
