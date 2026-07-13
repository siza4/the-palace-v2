# Development Principle — One Canonical Implementation

Adopted after this project accumulated real, working, but duplicate
implementations of the same subsystems (two admission engines, two
Throne-loading paths, two entry-verification paths, two notification
paths) built independently across different sessions, each unaware of
the other.

**Rule:** if an existing system needs improvement, evolve that
implementation. Do not create a second version alongside it, even
temporarily, even in a different file or directory, even with a
different function name for "clarity." The Palace has exactly one
canonical implementation of each subsystem — see the table in each
system's canonical doc (`docs/ADMISSION_WORKFLOW.md`,
`docs/CHAMBER_ARCHITECTURE.md`, and this file's own registry below) for
which file that is.

Before adding new logic for something that sounds like an existing
responsibility, check:
1. Does a canonical doc already name a file for this? Read it first.
2. Does grep for the responsibility's name turn up an existing
   function? If yes, extend or fix that function — don't write a new
   one beside it.
3. If you genuinely believe the existing implementation should be
   replaced rather than extended, say so explicitly and remove the old
   one in the same change — never leave both.

## Canonical implementation registry

| Subsystem | Canonical file(s) |
|---|---|
| Admission | `lib/engine/admission.js` — see `docs/ADMISSION_WORKFLOW.md` |
| Chamber access | `lib/services/chamber.service.js` — see `docs/CHAMBER_ARCHITECTURE.md` |
| Session/identity resolution | `lib/auth/verifySession.js` |
| Permission + Office checks | `lib/auth/permissions.js` |
| Entry verification | `lib/engine/entry.js` |
| Throne data | `app/api/throne/route.js` |
| Notifications | `lib/engine/notifications.js` |
| Activity log | `lib/engine/activity.js` |
| Standing | `lib/engine/standing.js` |
| Governance | `lib/engine/governance.js` |
| Treasury | `lib/engine/treasury.js` |
| Offices | `lib/engine/offices.js` |

Anything not on this list that duplicates one of these responsibilities
is drift — see `docs/DEPRECATED_CODE.md` for the current list awaiting
cleanup.
