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
--
-- Fixed during the forensic audit (see 029_forensic_audit_repairs.sql):
-- this file previously had a stray `END $$;` that closed the DO block
-- right after the founder_id lookup, leaving everything below it as
-- dangling SQL outside any block (referencing founder_id, which no
-- longer existed as an identifier once the block had closed). It also
-- upserted member_offices with `ON CONFLICT (member_id, office_id)`,
-- a constraint that does not exist on that table — confirmed against the
-- live schema — which would have thrown its own runtime error even with
-- the block closed correctly. Both are fixed below: one DO block, and
-- a NOT EXISTS guard instead of the nonexistent ON CONFLICT target.

DO $$
DECLARE
    founder_email text := 'akachrizzney@gmail.com';
    founder_id uuid;
    authority_role_id uuid;
    authority_standing_id uuid;
    authority_office_id uuid;
BEGIN
    SELECT id INTO founder_id
    FROM public.members
    WHERE email = founder_email;

    IF founder_id IS NULL THEN
        RAISE EXCEPTION 'No member found with email %. Edit this migration with the real founder email before running.', founder_email;
    END IF;

    -- Permission-bearing role (approve_membership, manage_standing, manage_offices, etc.)
    SELECT id INTO authority_role_id FROM public.royal_roles WHERE name = 'Palace Authority';

    IF authority_role_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.member_roles
        WHERE member_id = founder_id AND role_id = authority_role_id
    ) THEN
        INSERT INTO public.member_roles (member_id, role_id)
        VALUES (founder_id, authority_role_id);
    END IF;

    -- Standing (recognition — Chapter 5)
    SELECT id INTO authority_standing_id FROM public.standing_levels WHERE name = 'Authority Standing';

    IF authority_standing_id IS NOT NULL THEN
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
    END IF;

    -- Office (responsibility — Chapter 6)
    SELECT id INTO authority_office_id FROM public.offices WHERE name = 'Authority Office';

    IF authority_office_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.member_offices
        WHERE member_id = founder_id AND office_id = authority_office_id AND active = true
    ) THEN
        INSERT INTO public.member_offices (member_id, office_id, active, assigned_by, notes)
        VALUES (founder_id, authority_office_id, true, founder_id, 'Founding Authority bootstrap');
    END IF;

    RAISE NOTICE 'Founding Authority bootstrap complete for member %', founder_id;
END $$;
