import { redirect } from "next/navigation";

/**
 * This route was a second, unlinked copy of the /admission form —
 * confirmed via repo search that nothing links here. Two independent
 * copies of the same submission logic is exactly the kind of drift this
 * reconciliation pass is meant to remove, so this redirects to the one
 * canonical admission entry point instead of duplicating it again.
 * /identity (bare) is reserved for a future signed-in member's own
 * digital-identity dashboard (Royal ID/QR pass/Standing), not a form
 * for visitors.
 */
export default function IdentityFormRedirect() {
  redirect("/admission");
}
