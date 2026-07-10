import { requestMoreInformation } from '@/lib/engine/admission';
import { verifySession } from '@/lib/auth/verifySession';
import { hasPermission } from '@/lib/auth/permissions';

/**
 * Butler requests more information from an applicant. Records the request
 * as review_notes (institutional history) — see the note in
 * lib/engine/admission.js: no outbound email channel exists yet to
 * actually message the applicant. Requires approve_membership.
 */
export async function POST(request, { params }) {
  try {
    const { member, error: authError } = await verifySession(request);

    if (authError || !member) {
      return Response.json({ error: authError || 'Not authenticated' }, { status: 401 });
    }

    const allowed = await hasPermission(member.id, 'approve_membership');
    if (!allowed) {
      return Response.json(
        { error: 'You do not hold the approve_membership permission' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { message } = body;

    const result = await requestMoreInformation(params.id, member.id, message);
    return Response.json({ success: true, ...result }, { status: 200 });
  } catch (error) {
    console.error('Error requesting more information:', error);
    return Response.json(
      { error: error.message || 'Failed to update admission request' },
      { status: 500 }
    );
  }
}
