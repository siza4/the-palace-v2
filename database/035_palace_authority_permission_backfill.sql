-- Migration 035: Palace Authority permission backfill
--
-- Confirmed via live debug logging (dumping the actual member_roles ->
-- role_permissions -> permissions query result for the founder): Palace
-- Authority currently holds only propose_governance_change,
-- review_governance_proposal, decide_governance_proposal,
-- approve_membership, review_admission_request, and
-- decide_admission_request.
--
-- Three earlier migrations each intended to grant Palace Authority more
-- than that, via INSERT ... SELECT ... WHERE p.name IN (...) statements
-- with ON CONFLICT DO NOTHING — the same idiom already confirmed once
-- before to have partially failed for Royal Council's approve_membership
-- grant (see the original forensic audit). This time it's affected
-- Palace Authority instead, and more permissions:
--   - 019_permissions.sql: only approve_membership from that statement's
--     entire IN (...) list actually landed. manage_members,
--     manage_permissions, view_activity_log, manage_settings,
--     manage_treasury, view_chamber, post_in_chamber, create_chamber,
--     view_announcement, create_announcement did not.
--   - 022_standing.sql: manage_standing did not land — this is why
--     GET /api/standing/advance returned 403 for the founder live,
--     confirmed in the same debug session as the admission-queue bug
--     fixed alongside this migration.
--   - 023_offices.sql: manage_offices did not land.
--
-- Idempotent — safe to run more than once, and harmless if some of
-- these already exist (ON CONFLICT DO NOTHING on the existing
-- UNIQUE(role_id, permission_id) constraint).

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.royal_roles r, public.permissions p
WHERE r.name = 'Palace Authority'
AND p.name IN (
    'view_chamber', 'post_in_chamber', 'create_chamber',
    'view_announcement', 'create_announcement',
    'manage_members', 'manage_permissions', 'approve_membership',
    'view_activity_log', 'manage_settings', 'manage_treasury',
    'manage_standing', 'manage_offices'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;
