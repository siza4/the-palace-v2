import { revokeOffice, getMemberOffices } from '@/lib/engine/offices';
import { verifySession } from '@/lib/auth/verifySession';
import { hasPermission } from '@/lib/auth/permissions';

/**
 * Get a member's active Office assignments. A member can read their own;
 * reading someone else's requires manage_offices.
 */
export async function GET(request, { params }) {
  try {
    const { member: actingMember, error: authError } = await verifySession(request);

    if (authError || !actingMember) {
      return Response.json({ error: authError || 'Not authenticated' }, { status: 401 });
    }

    const { memberId } = await params;
    const targetId = memberId;

    if (targetId !== actingMember.id) {
      const allowed = await hasPermission(actingMember.id, 'manage_offices');
      if (!allowed) {
        return Response.json({ error: 'Not authorized' }, { status: 403 });
      }
    }

    const offices = await getMemberOffices(targetId);
    return Response.json({ offices }, { status: 200 });
  } catch (error) {
    console.error('Error fetching member offices:', error);
    return Response.json({ error: 'Failed to fetch offices' }, { status: 500 });
  }
}

/**
 * Revoke an Office from a member. Requires manage_offices.
 */
export async function DELETE(request, { params }) {
  try {
    const { memberId } = await params;
    const { member: actingMember, error: authError } = await verifySession(request);

    if (authError || !actingMember) {
      return Response.json({ error: authError || 'Not authenticated' }, { status: 401 });
    }

    const allowed = await hasPermission(actingMember.id, 'manage_offices');
    if (!allowed) {
      return Response.json(
        { error: 'You do not hold the manage_offices permission' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { officeName, reason } = body;

    if (!officeName) {
      return Response.json({ error: 'officeName is required' }, { status: 400 });
    }

    await revokeOffice(memberId, officeName, actingMember.id, reason);

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error revoking office:', error);
    return Response.json(
      { error: error.message || 'Failed to revoke office' },
      { status: 500 }
    );
  }
}
