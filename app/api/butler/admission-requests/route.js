import { listAdmissionRequests } from '@/lib/engine/admission';
import { verifySession } from '@/lib/auth/verifySession';
import { hasPermissionAndOffice } from '@/lib/auth/permissions';

/**
 * List admission requests for the Butler review queue. Requires
 * review_admission_request AND holding Admissions Office or Butler's
 * Office — permission alone is not enough (Charter: Permission AND
 * Office for institutional review functions).
 */
export async function GET(request) {
  try {
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const requests = await listAdmissionRequests(status);
    return Response.json({ requests }, { status: 200 });
  } catch (error) {
    console.error('Error listing admission requests:', error);
    return Response.json({ error: 'Failed to list admission requests' }, { status: 500 });
  }
}
