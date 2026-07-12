# The Palace — Admission Workflow (Canonical)

This is the single source of truth for how admission works, end to end.
If code and this document ever disagree, that's a bug in one of them —
open an issue rather than trusting either silently.

## Principle

No applicant becomes a Member before Authority approves. Filling in a
form creates an **Admission Request**, not an identity. Identity, Royal
Pass, and Standing are created in exactly one place:
`decideAdmissionRequest()`, on approval — nowhere else in the codebase
creates a `members` row from an admission request.

## Stages

```
Visitor
  │  fills in the public form at /admission
  ▼
Admission Request created            createAdmissionRequest()
  status: submitted                  lib/engine/admission.js
  │
  │  (optional) Admissions Office / Butler's Office reviews
  ▼
Recommendation recorded              reviewAdmissionRequest()
  status: under_review               requires: review_admission_request
  review_recommendation:             permission AND (Admissions Office
    accept | reject | request_info  OR Butler's Office)
  │
  │  Authority decides — required, and may act directly from
  │  'submitted' without waiting for a review
  ▼
Decision                             decideAdmissionRequest()
  status: approved | rejected        requires: decide_admission_request
                                      permission AND Authority Office
  │
  ├── rejected → done. No Member, no Pass, no Standing. The request
  │              row records decided_by/decision_reason/decided_at.
  │
  └── approved ↓
        Royal ID generated           generateRoyalId() (PLC-YYYY-NNNNNN)
        Member created                members row, status: 'Active'
        Profile initialized           member_profiles row
        Royal Pass created            royal_passes row (qr_data/barcode_data = Royal ID)
        Standing granted              grantInitialStanding() → member_standing
                                       (Member Standing, 1 day contribution window)
        Notification sent             sendNotification() — "Welcome to The Palace"
        Admission Request updated     status: approved, created_member_id set
```

## Two separate checks, deliberately not one

`review_admission_request` and `decide_admission_request` are different
permissions, granted to different roles, and the decide route
additionally requires holding **Authority Office** specifically (not
just any permission-bearing role). This is intentional — the Charter's
separation-of-powers principle means recommending and deciding are not
the same action, and `hasPermissionAndOffice()` (`lib/auth/permissions.js`)
enforces both the permission and the Office, not permission alone.

**Bootstrapping exception:** a freshly-founded Palace has exactly one
member — the founder — who holds Authority Office but deliberately does
*not* hold Admissions Office or Butler's Office (see
`030_founder_bootstrap_hardening.sql` / `029_fix_founder_bootstrap.sql`
— the founder governs, they don't automatically hold every operational
Office too). So the founder alone could never move a request past
`submitted` via the Review step. `decideAdmissionRequest()` has no
precondition on the request's current status, and the Butler UI shows
Authority's Approve/Reject buttons at both `submitted` and
`under_review` for exactly this reason — Authority can always act
directly. Once other members hold Admissions/Butler's Office, the
normal review-then-decide path is the expected one.

## Where each piece lives

| Responsibility | File |
|---|---|
| Engine (all admission logic) | `lib/engine/admission.js` |
| Public submission | `app/admission/page.js` → `POST /api/admission` |
| Butler review queue (list + UI) | `app/butler/admissions/page.js` → `GET /api/butler/admission-requests` |
| Recommendation | `POST /api/butler/admission-requests/[id]/review` |
| Binding decision | `POST /api/butler/admission-requests/[id]/decide` |
| Permission + Office check | `lib/auth/permissions.js` — `hasPermissionAndOffice()` |
| Session/identity resolution | `lib/auth/verifySession.js` |

There is exactly one implementation of each responsibility above. If
you find a second one, that's drift — remove it, don't add a third.

## Schema

`admission_requests` (migration `031`, `review_recommendation` column
added by `032`) — real columns: `id, full_name, email, phone, country,
applicant_notes, status, reviewed_by, review_recommendation,
review_notes, reviewed_at, decided_by, decision_reason, decided_at,
created_member_id, created_at, updated_at`. `status` CHECK constraint:
`submitted | under_review | approved | rejected | withdrawn`.

## What this replaced

An earlier version of `requestAdmission()` created a Member
immediately on form submission — no review, no approval, no
separation of powers. That instant-approval behavior no longer exists
anywhere in the codebase.
