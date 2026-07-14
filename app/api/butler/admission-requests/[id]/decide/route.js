import { decideAdmissionRequest } from '@/lib/engine/admission';
import { verifySession } from '@/lib/auth/verifySession';
import { hasPermissionAndOffice } from '@/lib/auth/permissions';

/**
 * Authority's binding decision. Requires decide_admission_request AND
 * holding Authority Office — the only path in the app that creates a
 * Member from an admission request. Approving creates members,
 * member_profiles, royal_passes, and grants initial Standing in one
 * transaction-like sequence (see decideAdmissionRequest).
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
    console.log("[DEBUG decide] Authenticated member:", member);
    console.log("[DEBUG decide] Permission being checked:", "decide_admission_request");
    console.log("[DEBUG decide] Office list:", ["Authority Office"]);

    const allowed = await hasPermissionAndOffice(
      member.id,
      'decide_admission_request',
      ['Authority Office']
    );

    console.log("[DEBUG decide] Permission result:", allowed);

    if (!allowed) {
      return Response.json(
        { error: 'You do not hold decide_admission_request together with Authority Office' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { decision, notes } = body;

    if (!['approved', 'rejected'].includes(decision)) {
      return Response.json({ error: "decision must be 'approved' or 'rejected'" }, { status: 400 });
    }

    const result = await decideAdmissionRequest(id, member.id, decision, notes);
    return Response.json(result, { status: 200 });
  } catch (error) {
    console.error('Error deciding admission request:', error);
    return Response.json({ error: error.message || 'Failed to decide admission request' }, { status: 500 });
  }
}
