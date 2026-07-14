import { listAdmissionRequests } from '@/lib/engine/admission';
import { verifySession } from '@/lib/auth/verifySession';
import { hasPermissionAndOffice } from '@/lib/auth/permissions';

/**
 * List admission requests for the Butler review queue. Requires
 * review_admission_request OR decide_admission_request, held together
 * with one of Admissions Office / Butler's Office / Authority Office.
 * Authority Office is included here (unlike the review action itself)
 * because Authority can decide directly on a submitted request without
 * an intermediate review — see docs/ADMISSION_WORKFLOW.md's
 * bootstrapping exception. Confirmed via live debug logging: the
 * founder held review_admission_request + Authority Office correctly,
 * but this route previously excluded Authority Office from the allowed
 * list, so Authority could never even see the queue to act on it.
 */
export async function GET(request) {
  try {
    const { member, error: authError } = await verifySession(request);
    if (authError || !member) {
      return Response.json({ error: authError || 'Not authenticated' }, { status: 401 });
    }

    const canReview = await hasPermissionAndOffice(
      member.id,
      'review_admission_request',
      ['Admissions Office', "Butler's Office", 'Authority Office']
    );
    const canDecide = !canReview && await hasPermissionAndOffice(
      member.id,
      'decide_admission_request',
      ['Authority Office']
    );

    if (!canReview && !canDecide) {
      return Response.json(
        { error: 'You do not hold review_admission_request or decide_admission_request together with the required Office' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const requests = await listAdmissionRequests(status);
    return Response.json({ requests }, { status: 200 });
  } catch (error) {
    console.error('Error listing admission requests:', error);
    return Response.json({ error: 'Failed to list admission requests' }, { status: 500 });
  }
}
