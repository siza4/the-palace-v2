-- Migration 029: Fix Founder Authority Bootstrap
--
-- Replaces 024_bootstrap_authority.sql, which is left in git history
-- unmodified (not deleted — preserve the record) but is syntactically
-- invalid: it contains a `DO $$...END $$` block that closes immediately
-- after the founder-existence check, followed by orphaned SQL statements
-- outside any block referencing variables (authority_role_id, founder_id)
-- that no longer exist in scope, plus a second stray `END $$;` with no
-- matching `DO $$`. It has never successfully executed against the live
-- database in this form.
--
-- This migration is idempotent — safe to run more than once.
--
-- LIVE-DATA ASSUMPTION (unverified): this assumes akachrizzney@gmail.com
-- already exists as a row in public.members (created via the admission
-- flow or manually) with some non-authority state, and that
-- akachrizzne@gmail.com (typo, one character short) may or may not exist
-- and may or may not hold Palace Authority live. Both cases are handled
-- safely below — if either assumption is wrong, the corresponding block
-- simply raises a clear exception (founder) or no-ops (typo account).

DO $$
DECLARE
    founder_email text := 'akachrizzney@gmail.com';
    typo_email text := 'akachrizzne@gmail.com';
    founder_id uuid;
    typo_id uuid;
    authority_role_id uuid;
    authority_office_id uuid;
    authority_standing_id uuid;
BEGIN
    SELECT id INTO founder_id FROM public.members WHERE email = founder_email;
    IF founder_id IS NULL THEN
        RAISE EXCEPTION 'No member found with email %. Confirm the founder account exists before running this migration.', founder_email;
    END IF;

    SELECT id INTO authority_role_id FROM public.royal_roles WHERE name = 'Palace Authority';
    IF authority_role_id IS NULL THEN
        RAISE EXCEPTION 'Role "Palace Authority" not found in royal_roles.';
    END IF;

    SELECT id INTO authority_office_id FROM public.offices WHERE name = 'Authority Office';
    IF authority_office_id IS NULL THEN
        RAISE EXCEPTION 'Office "Authority Office" not found in offices.';
    END IF;

    SELECT id INTO authority_standing_id FROM public.standing_levels WHERE name = 'Authority Standing';
    IF authority_standing_id IS NULL THEN
        RAISE EXCEPTION 'Standing level "Authority Standing" not found in standing_levels.';
    END IF;

    -- Role: Palace Authority
    INSERT INTO public.member_roles (member_id, role_id)
    VALUES (founder_id, authority_role_id)
    ON CONFLICT DO NOTHING;

    -- Standing: Authority Standing (highest Charter-defined rank)
    INSERT INTO public.member_standing (member_id, standing_level_id, status, grant_method, notes)
    VALUES (founder_id, authority_standing_id, 'active', 'appointment', 'Founding Authority bootstrap (029)')
    ON CONFLICT (member_id) DO UPDATE SET
        standing_level_id = EXCLUDED.standing_level_id,
        status = 'active',
        grant_method = 'appointment',
        notes = EXCLUDED.notes,
        updated_at = now();

    INSERT INTO public.standing_history (member_id, from_standing_id, to_standing_id, change_type, changed_by, reason)
    VALUES (founder_id, NULL, authority_standing_id, 'granted', founder_id, 'Founding Authority bootstrap (029)');

    -- Office: Authority Office only. Butler's Office / Admissions Office
    -- are deliberately NOT auto-assigned here, per Charter decision: the
    -- founder governs the institution, they don't automatically bypass
    -- its review structures by also holding every operational Office.
    INSERT INTO public.member_offices (member_id, office_id, active, assigned_by, notes)
    VALUES (founder_id, authority_office_id, true, founder_id, 'Founding Authority bootstrap (029)')
    ON CONFLICT (member_id, office_id) DO UPDATE SET
        active = true,
        assigned_by = EXCLUDED.assigned_by,
        notes = EXCLUDED.notes;

    UPDATE public.members SET status = 'Active' WHERE id = founder_id;

    -- Institutional memory: this bootstrap is itself a significant
    -- institutional action.
    INSERT INTO public.activity_logs (member_id, action, description, metadata)
    VALUES (
        founder_id,
        'FOUNDER_AUTHORITY_BOOTSTRAP',
        'Founding Authority correctly initialized via migration 029 (replaces broken 024).',
        jsonb_build_object('role', 'Palace Authority', 'office', 'Authority Office', 'standing', 'Authority Standing')
    );

    -- Typo account: document, strip privilege, preserve history. Does
    -- NOT delete the account or its history, per instruction. This block
    -- only acts if the account actually exists.
    SELECT id INTO typo_id FROM public.members WHERE email = typo_email;
    IF typo_id IS NOT NULL THEN
        INSERT INTO public.activity_logs (member_id, action, description, metadata)
        VALUES (
            typo_id,
            'TYPO_ACCOUNT_DOCUMENTED',
            'Identified as a debugging typo of the founder account during 029 bootstrap repair. Privileged Role/Office removed, Standing suspended. Account and prior history preserved, not deleted.',
            jsonb_build_object('correct_founder_email', founder_email, 'corrected_by', founder_id)
        );

        DELETE FROM public.member_roles
        WHERE member_id = typo_id AND role_id = authority_role_id;

        UPDATE public.member_offices
        SET active = false,
            revoked_at = now(),
            revoked_by = founder_id,
            notes = COALESCE(notes || ' | ', '') || 'Revoked: typo account, 029 bootstrap repair'
        WHERE member_id = typo_id AND active = true;

        UPDATE public.member_standing
        SET status = 'suspended', updated_at = now()
        WHERE member_id = typo_id;
    END IF;

    RAISE NOTICE 'Founding Authority bootstrap complete for member %. Typo account handled: %', founder_id, (typo_id IS NOT NULL);
END $$;
