import { decideStandingAdvancement } from '@/lib/engine/standing';
import { verifySession } from '@/lib/auth/verifySession';
import { hasPermission } from '@/lib/auth/permissions';

/**
 * Approve or reject a Standing advancement request.
 * Requires manage_standing — a permission held only by Palace Authority by
 * default (see migration 022). This is deliberately a narrower gate than
 * approve_membership, since Standing (recognition) and membership_plans
 * (product access) are different axes per the Golden Membership Rule.
 */
async function decide(request, { params }, approve) {
  try {
    const { id } = await params;
    const { member: actingMember, error: authError } = await verifySession(request);

    if (authError || !actingMember) {
      return Response.json({ error: authError || 'Not authenticated' }, { status: 401 });
    }

    const allowed = await hasPermission(actingMember.id, 'manage_standing');
    if (!allowed) {
      return Response.json(
        { error: 'You do not hold the manage_standing permission' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { decisionNotes } = body;

    const result = await decideStandingAdvancement(
      id,
      actingMember.id,
      approve,
      decisionNotes
    );

    return Response.json({ success: true, ...result }, { status: 200 });
  } catch (error) {
    console.error('Error deciding Standing advancement:', error);
    return Response.json(
      { error: error.message || 'Failed to decide advancement request' },
      { status: 500 }
    );
  }
}

export async function POST(request, ctx) {
  return decide(request, ctx, true);
}

export async function PUT(request, ctx) {
  return decide(request, ctx, false);
}
