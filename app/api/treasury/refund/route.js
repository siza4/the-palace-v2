import { refundContribution } from '@/lib/engine/treasury';
import { verifySession } from '@/lib/auth/verifySession';
import { hasPermission } from '@/lib/auth/permissions';

export async function POST(request) {
  try {
    const { member: actingMember, error: authError } = await verifySession(request);

    if (authError || !actingMember) {
      return Response.json({ error: authError || 'Not authenticated' }, { status: 401 });
    }

    const allowed = await hasPermission(actingMember.id, 'manage_treasury');
    if (!allowed) {
      return Response.json(
        { error: 'You do not hold the manage_treasury permission' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { contributionId, reason } = body;

    if (!contributionId) {
      return Response.json({ error: 'contributionId is required' }, { status: 400 });
    }

    const contribution = await refundContribution(contributionId, actingMember.id, reason);
    return Response.json({ contribution }, { status: 200 });
  } catch (error) {
    console.error('Error processing refund:', error);
    return Response.json(
      { error: error.message || 'Failed to process refund' },
      { status: 500 }
    );
  }
}
