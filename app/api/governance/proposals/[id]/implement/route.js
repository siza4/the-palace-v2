import { markImplemented } from '@/lib/engine/governance';
import { verifySession } from '@/lib/auth/verifySession';
import { hasPermission } from '@/lib/auth/permissions';

/**
 * Mark an approved proposal implemented. Reuses decide_governance_proposal
 * as the gate — the same Authority Office holders who can approve are
 * responsible for confirming implementation actually happened.
 */
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const { member, error: authError } = await verifySession(request);
    if (authError || !member) {
      return Response.json({ error: authError || 'Not authenticated' }, { status: 401 });
    }

    const allowed = await hasPermission(member.id, 'decide_governance_proposal');
    if (!allowed) {
      return Response.json(
        { error: 'You do not hold the decide_governance_proposal permission' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { documentation } = body;

    if (!documentation) {
      return Response.json(
        { error: 'documentation is required to close out a governance change (Charter 18.9)' },
        { status: 400 }
      );
    }

    const proposal = await markImplemented(id, member.id, documentation);
    return Response.json({ proposal }, { status: 200 });
  } catch (error) {
    console.error('Error marking proposal implemented:', error);
    return Response.json(
      { error: error.message || 'Failed to mark implemented' },
      { status: 500 }
    );
  }
}
