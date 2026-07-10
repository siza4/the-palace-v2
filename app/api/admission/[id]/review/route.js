import { markUnderReview } from '@/lib/engine/admission';
import { verifySession } from '@/lib/auth/verifySession';
import { hasPermission } from '@/lib/auth/permissions';

/**
 * Butler Investigation: move an Admission Request from submitted to
 * under_review. Requires approve_membership.
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

    const result = await markUnderReview(params.id, member.id);
    return Response.json({ success: true, ...result }, { status: 200 });
  } catch (error) {
    console.error('Error marking admission request under review:', error);
    return Response.json(
      { error: error.message || 'Failed to update admission request' },
      { status: 500 }
    );
  }
}
