import { redirect } from "next/navigation";

/**
 * This route used to duplicate the admission form found at /admission,
 * calling requestAdmission() directly and redirecting to
 * /identity/${member.id} on success. That assumed admission created a
 * member immediately, which stopped being true with the Admission
 * Authority System (Milestone 2) — requestAdmission() now only creates
 * an admission_request pending Butler review, so there is no member.id
 * to redirect to.
 *
 * Nothing in the app links here (confirmed via repo search), so rather
 * than maintain two copies of the same form with two copies of the same
 * fix, this now points to the one canonical admission entry point.
 * /identity (bare) is reserved for the future digital-identity dashboard
 * described in the roadmap (Stage 4) — a signed-in member's own view of
 * their Royal ID/QR pass/Standing, not a form for visitors.
 */
export default function IdentityFormRedirect() {
  redirect("/admission");
}
