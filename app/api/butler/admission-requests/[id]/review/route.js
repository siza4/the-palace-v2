import { reviewAdmissionRequest } from '@/lib/engine/admission';
import { verifySession } from '@/lib/auth/verifySession';
import { hasPermissionAndOffice } from '@/lib/auth/permissions';

/**
 * Admissions Office / Butler's Office records a recommendation. Cannot
 * approve or reject membership itself — moves status to 'under_review'
 * and records the recommendation (accept/reject/request_info) in
 * review_recommendation. Authority's decide route makes the binding
 * decision, and may also act directly from 'submitted' without waiting
 * for this step. Separation of powers.
 */
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const { member, error: authError } = await verifySession(request);
    if (authError || !member) {
      return Response.json({ error: authError || 'Not authenticated' }, { status: 401 });
    }

    // TEMPORARY DEBUG LOGGING — remove once the permission-check
    // mismatch is diagnosed. Do not leave this in production.
    console.log("[DEBUG review] Authenticated member:", member);
    console.log("[DEBUG review] Permission being checked:", "review_admission_request");
    console.log("[DEBUG review] Office list:", ["Admissions Office", "Butler's Office"]);

    const allowed = await hasPermissionAndOffice(
      member.id,
      'review_admission_request',
      ['Admissions Office', "Butler's Office"]
    );

    console.log("[DEBUG review] Permission result:", allowed);

    if (!allowed) {
      return Response.json(
        { error: 'You do not hold review_admission_request together with Admissions Office or Butler\'s Office' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { recommendation, notes } = body;

    if (!['accept', 'reject', 'request_info'].includes(recommendation)) {
      return Response.json(
        { error: "recommendation must be 'accept', 'reject', or 'request_info'" },
        { status: 400 }
      );
    }

    const updated = await reviewAdmissionRequest(id, member.id, recommendation, notes);
    return Response.json({ request: updated }, { status: 200 });
  } catch (error) {
    console.error('Error reviewing admission request:', error);
    return Response.json({ error: error.message || 'Failed to review admission request' }, { status: 500 });
  }
}
