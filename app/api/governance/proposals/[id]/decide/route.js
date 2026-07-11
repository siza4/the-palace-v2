import { decideProposal } from '@/lib/engine/governance';
import { verifySession } from '@/lib/auth/verifySession';
import { hasPermission } from '@/lib/auth/permissions';

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
    const { decision, decisionNotes } = body;

    if (!['approved', 'rejected'].includes(decision)) {
      return Response.json(
        { error: "decision must be 'approved' or 'rejected'" },
        { status: 400 }
      );
    }

    const record = await decideProposal(id, member.id, decision, decisionNotes);
    return Response.json({ decision: record }, { status: 201 });
  } catch (error) {
    console.error('Error deciding proposal:', error);
    return Response.json(
      { error: error.message || 'Failed to decide proposal' },
      { status: 500 }
    );
  }
}
