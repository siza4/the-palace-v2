-- Migration 024: Bootstrap Founding Authority
-- CRITICAL: member_roles was never inserted into anywhere in the codebase
-- prior to this milestone — meaning no member has ever held any Standing
-- Office/Permission-backed role, including the founder. Every permission
-- check (approve_membership, manage_standing, manage_offices) currently
-- returns false for everyone, with no way to bootstrap out of that state
-- through the app itself (correctly — nobody should be able to grant
-- themselves Authority via the API, per Charter 21.13).
--
-- This migration is NOT auto-applied to any account. Replace the
-- placeholder email below with the founder's real member email before
-- running it in the Supabase SQL editor. Run it exactly once.

DO $$
DECLARE
    founder_email text := 'REPLACE_WITH_FOUNDER_EMAIL@example.com';
    founder_id uuid;
    authority_role_id uuid;
    authority_standing_id uuid;
    authority_office_id uuid;
BEGIN
    SELECT id INTO founder_id FROM public.members WHERE email = founder_email;

    IF founder_id IS NULL THEN
        RAISE EXCEPTION 'No member found with email %. Edit this migration with the real founder email before running.', founder_email;
    END IF;

    -- Permission-bearing role (approve_membership, manage_standing, manage_offices, etc.)
    SELECT id INTO authority_role_id FROM public.royal_roles WHERE name = 'Palace Authority';
    INSERT INTO public.member_roles (member_id, role_id)
    VALUES (founder_id, authority_role_id)
    ON CONFLICT DO NOTHING;

    -- Standing (recognition — Chapter 5)
    SELECT id INTO authority_standing_id FROM public.standing_levels WHERE name = 'Authority Standing';
    INSERT INTO public.member_standing (member_id, standing_level_id, status, grant_method, notes)
    VALUES (founder_id, authority_standing_id, 'active', 'appointment', 'Founding Authority bootstrap')
    ON CONFLICT (member_id) DO UPDATE SET
        standing_level_id = EXCLUDED.standing_level_id,
        status = 'active',
        grant_method = 'appointment',
        notes = EXCLUDED.notes,
        updated_at = now();

    INSERT INTO public.standing_history (member_id, from_standing_id, to_standing_id, change_type, changed_by, reason)
    VALUES (founder_id, NULL, authority_standing_id, 'granted', founder_id, 'Founding Authority bootstrap');

    -- Office (responsibility — Chapter 6)
    SELECT id INTO authority_office_id FROM public.offices WHERE name = 'Authority Office';
    INSERT INTO public.member_offices (member_id, office_id, active, assigned_by, notes)
    VALUES (founder_id, authority_office_id, true, founder_id, 'Founding Authority bootstrap')
    ON CONFLICT (member_id, office_id) DO UPDATE SET
        active = true,
        assigned_by = EXCLUDED.assigned_by,
        notes = EXCLUDED.notes;

    RAISE NOTICE 'Founding Authority bootstrap complete for member %', founder_id;
END $$;
