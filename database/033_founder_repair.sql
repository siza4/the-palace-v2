-- Migration 033: Founder Repair
--
-- The founder account predates the current admission architecture — it
-- was inserted directly into members before decideAdmissionRequest()
-- existed, which is the only place that currently creates a Member's
-- Profile, Royal Pass, and Standing together, atomically, on approval.
-- 029/030 already granted the founder's Role/Office/Standing, but never
-- touched royal_passes or member_profiles, which aren't part of the
-- authority-bootstrap concern those migrations were written for.
--
-- Confirmed live: SELECT * FROM royal_passes WHERE member_id = '<founder>'
-- returned zero rows — this is what surfaced as "No Royal Pass found for
-- this identity" on login, since enterPalace() (lib/engine/entry.js)
-- correctly treats a missing Pass as access-denied. No code was changed
-- for this — the code is doing exactly what it should; the founder's
-- data was simply incomplete for a flow that didn't exist yet when the
-- account was created.
--
-- This migration is intentionally comprehensive rather than a single
-- INSERT, so any member account (not just the founder) that predates
-- part of the current flow can be brought up to date the same way,
-- without chasing missing records one reported error at a time. Every
-- statement is guarded and safe to run more than once.

DO $$
DECLARE
    founder_email text := 'akachrizzney@gmail.com';
    founder_id uuid;
    founder_royal_id text;
BEGIN
    SELECT id, royal_id INTO founder_id, founder_royal_id
    FROM public.members
    WHERE email = founder_email;

    IF founder_id IS NULL THEN
        RAISE EXCEPTION 'No member found with email %.', founder_email;
    END IF;

    IF founder_royal_id IS NULL THEN
        RAISE EXCEPTION 'Founder member % has no royal_id set — cannot create a Royal Pass without one.', founder_id;
    END IF;

    -- Royal Pass (the confirmed missing piece)
    IF NOT EXISTS (SELECT 1 FROM public.royal_passes WHERE member_id = founder_id) THEN
        INSERT INTO public.royal_passes (member_id, qr_data, barcode_data, active)
        VALUES (founder_id, founder_royal_id, founder_royal_id, true);
    END IF;

    -- Profile — same shape initializeProfile() (lib/engine/profile.js)
    -- creates for every approved applicant, except royal_title: the
    -- generic 'Citizen' default that function uses for new admissions
    -- doesn't fit an account that already holds Authority Standing, so
    -- this sets it to 'Authority' specifically for the founder.
    IF NOT EXISTS (SELECT 1 FROM public.member_profiles WHERE member_id = founder_id) THEN
        INSERT INTO public.member_profiles (member_id, display_name, royal_title)
        SELECT founder_id, full_name, 'Authority' FROM public.members WHERE id = founder_id;
    END IF;

    -- Role / Office / Standing: 029/030 already handle these, but
    -- included here too so this migration alone is a complete repair —
    -- harmless no-ops if 029/030 already ran.
    IF NOT EXISTS (
        SELECT 1 FROM public.member_roles mr
        JOIN public.royal_roles rr ON rr.id = mr.role_id
        WHERE mr.member_id = founder_id AND rr.name = 'Palace Authority'
    ) THEN
        INSERT INTO public.member_roles (member_id, role_id)
        SELECT founder_id, id FROM public.royal_roles WHERE name = 'Palace Authority';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.member_offices mo
        JOIN public.offices o ON o.id = mo.office_id
        WHERE mo.member_id = founder_id AND o.name = 'Authority Office' AND mo.active = true
    ) THEN
        INSERT INTO public.member_offices (member_id, office_id, active, assigned_by, notes)
        SELECT founder_id, id, true, founder_id, 'Founder repair (033)' FROM public.offices WHERE name = 'Authority Office';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.member_standing WHERE member_id = founder_id) THEN
        INSERT INTO public.member_standing (member_id, standing_level_id, status, grant_method, notes)
        SELECT founder_id, id, 'active', 'appointment', 'Founder repair (033)'
        FROM public.standing_levels WHERE name = 'Authority Standing';
    END IF;

    INSERT INTO public.activity_logs (member_id, action, description, metadata)
    VALUES (
        founder_id,
        'FOUNDER_DATA_REPAIR',
        'Founder account brought up to date with current architecture (migration 033): Royal Pass and Profile backfilled.',
        jsonb_build_object('royal_id', founder_royal_id)
    );

    RAISE NOTICE 'Founder repair complete for member % (Royal ID %)', founder_id, founder_royal_id;
END $$;
