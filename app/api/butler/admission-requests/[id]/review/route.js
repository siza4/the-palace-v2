import { reviewAdmissionRequest } from '@/lib/engine/admission';
import { verifySession } from '@/lib/auth/verifySession';
import { hasPermissionAndOffice } from '@/lib/auth/permissions';

/**
 * Admissions Office / Butler's Office records a recommendation. Cannot
 * approve or reject membership itself — only sets the request to
 * 'recommended' or 'declined_by_admissions'. Authority's decide route
 * makes the binding decision. Separation of powers.
 */
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const { member, error: authError } = await verifySession(request);
    if (authError || !member) {
      return Response.json({ error: authError || 'Not authenticated' }, { status: 401 });
    }

    const allowed = await hasPermissionAndOffice(
      member.id,
      'review_admission_request',
      ['Admissions Office', "Butler's Office"]
    );

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
