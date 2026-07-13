# The Palace — System Bible

The canonical reference for every subsystem's current state. Written
after static/code-level verification of everything below; **"Status"
reflects confirmed-correct code, not yet a completed live walkthrough**
— re-confirm each row against the actual end-to-end test pass
(Admission → Login → Entry → Throne → Butler → Standing → Governance →
Treasury → Chambers → Notifications) and update this document with the
real result, not the expected one, once that's done.

---

## 1. Admission

**Status:** Code-verified working. Pending live walkthrough confirmation.
**Tables:** `admission_requests`, `members`, `member_profiles`, `royal_passes`, `member_standing`
**Routes:** `POST /api/admission` (submit), `GET /api/butler/admission-requests` (queue), `POST /api/butler/admission-requests/[id]/review`, `POST/PUT /api/butler/admission-requests/[id]/decide`
**Authorization:** `review_admission_request` permission + (Admissions Office OR Butler's Office) to review; `decide_admission_request` permission + Authority Office to decide. See `docs/ADMISSION_WORKFLOW.md`.
**Technical debt:** none known.

## 2. Login

**Status:** Code-verified working.
**Tables:** none directly — Supabase Auth manages its own `auth.users`
**Routes:** none — client-side `supabase.auth.signInWithOtp()`
**Authorization:** none at this stage — proves email ownership only, not Palace authorization
**Technical debt:** email case-sensitivity — `members.email` is matched exactly, no normalization anywhere in the admission-to-login chain. Not currently causing a known failure, but fragile.

## 3. Entry

**Status:** Fixed this project — was broken (`getMemberById`/`getRoyalPass` used an unauthenticated client). Code-verified working now.
**Tables:** `members`, `royal_passes`, `member_standing` (via `getMembershipStatus`)
**Routes:** none directly — `enterPalace()` is called from `app/api/throne/route.js`
**Authorization:** identity already resolved by `verifySession()`; this is a post-authentication check (does this member have a valid Pass and non-lapsed Standing)
**Technical debt:** none known, now that the client fix landed.

## 4. Throne

**Status:** Fixed this project (same root cause as Entry). Code-verified working.
**Tables:** `members`, `member_profiles`, `royal_passes`, `announcements`, `chambers`, `member_offices`, `member_standing`
**Routes:** `GET /api/throne`
**Authorization:** `verifySession()` + `enterPalace()`
**Technical debt:** none known — Chambers list now uses the fixed institutional-authority computation (see #9).

## 5. Butler

**Status:** Code-verified working.
**Tables:** varies by page (admission_requests, standing_advancement_requests, governance_proposals, treasury_contributions)
**Routes:** `GET /api/butler/admission-requests` and the standing/governance/treasury equivalents
**Authorization:** each page checks its own relevant permission via `hasPermission`/`hasPermissionAndOffice`
**Technical debt:** none known.

## 6. Standing

**Status:** Code-verified working.
**Tables:** `member_standing`, `standing_levels`, `standing_history`, `standing_advancement_requests`
**Routes:** `POST /api/standing/advance`, `POST/PUT /api/standing/advance/[id]`
**Authorization:** `manage_standing` permission (route-layer, matching the pattern in `lib/engine/standing.js`)
**Technical debt:** none known.

## 7. Governance

**Status:** Code-verified working.
**Tables:** `governance_proposals`, `governance_reviews`, `governance_decisions`
**Routes:** `POST /api/governance/proposals`, `POST /api/governance/proposals/[id]/review`, `POST /api/governance/proposals/[id]/decide`, `POST /api/governance/proposals/[id]/implement`
**Authorization:** `propose_governance_change` to create; Council Office to review; Authority Office to decide (checked in `lib/engine/governance.js` directly, not just at the route layer)
**Technical debt:** constitutional proposals require unanimous support from every *active* Council Office holder. On a fresh install with zero Council Office holders, no constitutional proposal can ever be approved. This is correct by Charter design, not a bug, but worth knowing before testing this path — appoint at least one Council Office holder first.

## 8. Treasury

**Status:** Code-verified working.
**Tables:** `treasury_contributions`
**Routes:** `POST /api/treasury/contribute`, `GET /api/treasury/contributions`, `POST /api/treasury/refund`, `POST /api/webhooks/stripe`
**Authorization:** contribution creation is member-initiated for their own account; refund requires the relevant permission; the webhook is the only route that can confirm a contribution, and only after verifying Stripe's signature
**Technical debt:** requires `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` to be configured to actually process payments — degrades gracefully (`type: 'unconfigured'`) if not set, doesn't error.

## 9. Chambers

**Status:** Fixed this project (was a confirmed severe bug — `member_chambers` had no writer anywhere, so access was denied unconditionally for everyone). Redesigned to compute access from Office + Standing directly. Code-verified; needs live confirmation now that the underlying model changed.
**Tables:** `chambers`, `member_offices`, `member_standing` (no longer `member_chambers` for authorization — table kept, unused in the access path)
**Routes:** `GET /api/chamber/[id]`
**Authorization:** see `docs/CHAMBER_ARCHITECTURE.md` — Office match if `required_office` is set, else any active Standing
**Technical debt:** none known post-fix, but this is the least live-tested change in this document — verify it first.

## 10. Notifications

**Status:** Fixed this project (RLS/service-role issue). Code-verified working.
**Tables:** `notifications`
**Routes:** none directly — called internally by `lib/engine/admission.js` on approval, and available for other flows via `lib/engine/notifications.js`
**Authorization:** none — system-initiated, not member-initiated
**Technical debt:** a dead duplicate (`lib/services/notification.service.js`) exists — see `docs/DEPRECATED_CODE.md`, not removed yet.

---

## Also relevant

**Identity** (public verification, not in the walkthrough's ten but worth tracking): fixed this project — was broken (public page relied on RLS that required authentication). Now backed by a dedicated `identity_verification` view (migration `034`) exposing only public-safe fields. Needs live confirmation.

## One principle going forward

See `docs/DEVELOPMENT_PRINCIPLES.md` — exactly one canonical
implementation per subsystem. Check that registry before writing new
logic for anything that sounds like it might already exist.
