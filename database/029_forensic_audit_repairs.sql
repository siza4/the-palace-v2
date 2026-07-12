-- Migration 029: Forensic audit repairs
--
-- Fixes three confirmed live findings from the forensic audit:
--
--   C-2/H-1: 024_bootstrap_authority.sql has a syntax error (a stray
--   `END $$;` closes the DO block early, leaving the role/office INSERTs
--   as dangling SQL referencing out-of-scope variables). Live queries
--   confirmed the real founder account (correctly spelled) has no role,
--   no office, and no Standing — status is still 'Pending'. A *different*,
--   mistyped email (missing the "y") holds the Palace Authority role
--   instead, most likely from a manual SQL-editor workaround at some point.
--   This block grants the correct founder everything 024 was supposed to,
--   without touching the mistyped account — that's a separate decision
--   for a human to make, not something to silently delete here.
--
--   H-2: role_permissions is missing Royal Council -> approve_membership,
--   which 019_permissions.sql was supposed to seed. Re-inserts everything
--   019 intended for Royal Council, idempotently, regardless of whether
--   the gap was one row or the whole block silently not running.
--
--   C-3: two live chambers have required_office values that don't match
--   any real office name ('Royal Council' vs 'Council Office', and
--   'Royal Member' vs 'Royal Member Office'), making them permanently
--   inaccessible via memberHoldsOffice()'s exact-string match.
--
-- Every statement below is safe to run more than once.

-- ---------------------------------------------------------------------
-- Founder: role, Office, Standing, and status
-- ---------------------------------------------------------------------
DO $$
DECLARE
    founder_id uuid;
    authority_role_id uuid;
    authority_office_id uuid;
    member_standing_id uuid;
BEGIN
    SELECT id INTO founder_id
    FROM public.members
    WHERE email = 'akachrizzney@gmail.com';

    IF founder_id IS NULL THEN
        RAISE NOTICE 'Founder account akachrizzney@gmail.com not found — skipping founder bootstrap.';
        RETURN;
    END IF;

    -- Palace Authority role
    SELECT id INTO authority_role_id FROM public.royal_roles WHERE name = 'Palace Authority';

    IF authority_role_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.member_roles
        WHERE member_id = founder_id AND role_id = authority_role_id
    ) THEN
        INSERT INTO public.member_roles (member_id, role_id)
        VALUES (founder_id, authority_role_id);
    END IF;

    -- Authority Office
    SELECT id INTO authority_office_id FROM public.offices WHERE name = 'Authority Office';

    IF authority_office_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.member_offices
        WHERE member_id = founder_id AND office_id = authority_office_id AND active = true
    ) THEN
        INSERT INTO public.member_offices (member_id, office_id, active, assigned_by, notes)
        VALUES (founder_id, authority_office_id, true, founder_id, 'Founder bootstrap repair (migration 029)');
    END IF;

    -- Standing: grant Authority Standing if the founder has none at all yet.
    -- (024_bootstrap_authority.sql intended 'Authority Standing' specifically
    -- for the founder — matching that here rather than a generic level.)
    IF NOT EXISTS (SELECT 1 FROM public.member_standing WHERE member_id = founder_id) THEN
        SELECT id INTO member_standing_id FROM public.standing_levels WHERE name = 'Authority Standing';

        IF member_standing_id IS NOT NULL THEN
            INSERT INTO public.member_standing (
                member_id, standing_level_id, status, grant_method, notes,
                granted_at, contribution_expires_at
            )
            VALUES (
                founder_id, member_standing_id, 'active', 'appointment',
                'Founding Authority bootstrap (migration 029 repair)',
                now(), now() + interval '3650 days'
            );

            INSERT INTO public.standing_history (
                member_id, from_standing_id, to_standing_id, change_type, changed_by, reason
            )
            VALUES (
                founder_id, NULL, member_standing_id, 'granted', founder_id,
                'Founding Authority bootstrap (migration 029 repair)'
            );
        END IF;
    END IF;

    -- Status: founder should not remain stuck at the default 'Pending'
    UPDATE public.members
    SET status = 'Active'
    WHERE id = founder_id AND status = 'Pending';

    RAISE NOTICE 'Founder bootstrap repair complete for akachrizzney@gmail.com';
END $$;

-- ---------------------------------------------------------------------
-- Royal Council: re-seed everything 019_permissions.sql intended,
-- idempotently, regardless of whether the gap was one row or the whole
-- block silently not running. role_permissions already has a
-- UNIQUE(role_id, permission_id) constraint (019), so ON CONFLICT is the
-- same idiom the original seed migration used.
-- ---------------------------------------------------------------------
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT rr.id, p.id
FROM public.royal_roles rr, public.permissions p
WHERE rr.name = 'Royal Council'
AND p.name IN (
    'view_chamber', 'post_in_chamber', 'create_chamber',
    'view_announcement', 'create_announcement',
    'manage_members', 'approve_membership', 'view_activity_log'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ---------------------------------------------------------------------
-- Chamber required_office naming fix
-- ---------------------------------------------------------------------
UPDATE public.chambers SET required_office = 'Council Office' WHERE required_office = 'Royal Council';
UPDATE public.chambers SET required_office = 'Royal Member Office' WHERE required_office = 'Royal Member';
