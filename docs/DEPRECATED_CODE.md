# Deprecated Code — Awaiting Removal

Per audit decision (2026-07): these seven files are confirmed
unreachable — dependency-mapped by grepping every import and every
route in the repo, not assumed. None are deleted yet. They stay until
the first stable Palace release is complete and the end-to-end
walkthrough (Admission → Login → Entry → Throne → Butler → Standing →
Governance → Treasury → Chambers → Notifications) has passed. Removal
happens in one dedicated cleanup commit after that — not before, and
not piecemeal.

Each file below now also carries an inline `@deprecated` comment with
the same information, so this isn't only discoverable by reading this
document.

| File | Why it's dead | What replaced it |
|---|---|---|
| `lib/services/throne.service.js` (`getThroneData`) | Only caller is `lib/engine/throne.js`, itself unreachable | `app/api/throne/route.js` + `lib/engine/entry.js` |
| `lib/engine/throne.js` (`loadThrone`) | No caller anywhere in the app | same as above |
| `lib/services/session.service.js` (`getCurrentMember`) | Only caller is `lib/engine/security.js`, itself unreachable | `lib/auth/verifySession.js` |
| `lib/engine/security.js` (`verifyPalaceEntry`) | No caller anywhere in the app | `lib/auth/verifySession.js` + `lib/auth/permissions.js` |
| `lib/services/notification.service.js` (`createNotification`, `getMemberNotifications`) | No caller anywhere in the app | `lib/engine/notifications.js` (`sendNotification`) |
| `lib/services/activity.service.js` (`createActivity`, `getMemberActivity`) | No caller anywhere in the app | `lib/engine/activity.js` (`logActivity`) |
| `lib/services/chamberPost.service.js` (`getChamberPosts`) | No caller anywhere in the app | inline query in `app/api/chamber/[id]/route.js` |

None of these were fixed for the RLS/service-role issues found and
repaired elsewhere in the live code paths (they still use the plain
anon client where relevant) — another reason not to let a future change
accidentally start calling into them again under the assumption they're
current.
