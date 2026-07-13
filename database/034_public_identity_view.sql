-- Migration 034: Public identity verification view
--
-- app/identity/[id]/page.js was already written to be a public,
-- unauthenticated verification page (its own comment: "Public-safe
-- fields only. full_name and email are legal identity and must never
-- be served on a public route") — the intended use case is a QR/barcode
-- pass being scanned by someone who is not necessarily a logged-in
-- Palace member (a door, an event check-in), the same way a physical
-- membership card doesn't require the person checking it to have their
-- own account. That intent was never actually reachable: members' only
-- SELECT policy requires the authenticated role (confirmed via live
-- pg_policies query), so an anonymous visitor got zero rows regardless
-- of which columns the page asked for — RLS is row-level, not
-- column-level, so restricting the SELECT list in application code was
-- never enough on its own.
--
-- Rather than grant anon direct SELECT on members (which would apply
-- to the whole row, and rely entirely on every future caller
-- remembering to restrict columns), this creates a narrow view exposing
-- only the fields the page actually needs, and grants anon SELECT on
-- the view alone. members itself stays exactly as locked down as it is
-- today.

CREATE OR REPLACE VIEW public.identity_verification AS
SELECT
    m.id,
    m.royal_id,
    m.royal_office,
    m.membership_status,
    m.membership_level,
    ms.status AS standing_status,
    sl.name AS standing_name
FROM public.members m
LEFT JOIN public.member_standing ms ON ms.member_id = m.id
LEFT JOIN public.standing_levels sl ON sl.id = ms.standing_level_id;

GRANT SELECT ON public.identity_verification TO anon, authenticated;
