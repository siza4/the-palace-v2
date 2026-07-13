# The Palace — Chamber Architecture (Canonical)

## Principle

Chapter 7 of the Charter states this directly: **"Access is determined
by: Standing + Office + Permission."** Chamber access is computed from
a member's current institutional standing, not from a separately
maintained membership list. Chapter 5 ties this explicitly to Standing
progression: *"Member Standing → Member Chambers," "Council Standing →
Council Chamber access."*

## What changed, and why

The original design gated Chamber access on **both** an explicit
`member_chambers` membership row **and** (if set) the Chamber's
`required_office`. Nothing anywhere in the codebase ever wrote to
`member_chambers` — confirmed by exhaustive search, not assumption — so
every Chamber denied every member unconditionally, including the
founder, regardless of Office or Standing. The Office check was
correct but unreachable, since the membership-list check ran first and
always failed.

`member_chambers` is **not removed** — it's kept for future optional
use (invitations, per-member overrides) — but it is no longer part of
the authorization path.

## The model

```
canAccessChamber(memberId, chamberId):
  chamber.required_office set?
    yes → does the member hold that Office? (memberHoldsOffice(),
          exact match against offices.name)
    no  → does the member hold any currently active Standing?
          (member_standing.status = 'active')
```

A Chamber with no `required_office` is open to any member in good
Standing — not to anyone, and not to no one. A Chamber with a
`required_office` is gated on that Office specifically, independent of
Standing level (an Authority Office holder reaches the Authority
Chamber regardless of which Standing tier they're also carrying).

`getMemberChambers(memberId)` computes the same thing across every
Chamber at once, for Throne's chamber list — not a stored list, a
live computation from the member's current Offices and Standing.
Returns the same shape the old `member_chambers` join produced
(`{ id, access_level, chambers: {...} }`) so existing consumers
(`app/throne/page.js`) didn't need to change. `access_level` is now a
derived label — the required Office's name, or `'Member'` for
baseline Standing-gated Chambers — not a value anything ever actually
set.

## Where this lives

| Responsibility | File |
|---|---|
| Single-Chamber access check | `lib/services/chamber.service.js` — `canAccessChamber()` |
| Full accessible-Chamber list | `lib/services/chamber.service.js` — `getMemberChambers()` |
| Office-holding check | `lib/engine/offices.js` — `memberHoldsOffice()` |
| Live Chamber content route | `app/api/chamber/[id]/route.js` |
| Chamber list on Throne | `app/api/throne/route.js` → `lib/engine/chamber.js` → `getMemberChambers()` |

There is exactly one implementation of Chamber access control. If a
second one appears, that's drift — evolve this one instead.
