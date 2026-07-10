import { decideAdmission } from '@/lib/engine/admission';
import { verifySession } from '@/lib/auth/verifySession';
import { hasPermission } from '@/lib/auth/permissions';

/**
 * Approve or reject an Admission Request. Approve is where identity,
 * Royal Pass, and Standing actually get created (see decideAdmission()).
 * Requires approve_membership.
 */
async function decide(request, { params }, approve) {
  try {
    const { member: actingMember, error: authError } = await verifySession(request);

    if (authError || !actingMember) {
      return Response.json({ error: authError || 'Not authenticated' }, { status: 401 });
    }

    const allowed = await hasPermission(actingMember.id, 'approve_membership');
    if (!allowed) {
      return Response.json(
        { error: 'You do not hold the approve_membership permission' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { decisionReason } = body;

    const result = await decideAdmission(params.id, actingMember.id, approve, decisionReason);

    return Response.json({ success: true, ...result }, { status: 200 });
  } catch (error) {
    console.error('Error deciding admission request:', error);
    return Response.json(
      { error: error.message || 'Failed to decide admission request' },
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
