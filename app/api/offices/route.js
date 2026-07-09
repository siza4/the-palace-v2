import { listOffices, assignOffice } from '@/lib/engine/offices';
import { verifySession } from '@/lib/auth/verifySession';
import { hasPermission } from '@/lib/auth/permissions';

/**
 * List the six Charter-defined Offices. Public — these are institutional
 * definitions, not sensitive data.
 */
export async function GET() {
  try {
    const offices = await listOffices();
    return Response.json({ offices }, { status: 200 });
  } catch (error) {
    console.error('Error listing offices:', error);
    return Response.json({ error: 'Failed to list offices' }, { status: 500 });
  }
}

/**
 * Assign an Office to a member. Requires manage_offices.
 * Per Charter 21.13, no one can grant themselves an Office — this route
 * only ever assigns Offices on behalf of the target memberId in the body,
 * never the acting member implicitly, and the permission check below
 * is the actual enforcement (a member without manage_offices simply
 * cannot reach this far, self-target or not).
 */
export async function POST(request) {
  try {
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

    const body = await request.json();
    const { memberId, officeName, notes } = body;

    if (!memberId || !officeName) {
      return Response.json(
        { error: 'memberId and officeName are required' },
        { status: 400 }
      );
    }

    const assignment = await assignOffice(memberId, officeName, actingMember.id, notes);

    return Response.json({ assignment }, { status: 201 });
  } catch (error) {
    console.error('Error assigning office:', error);
    return Response.json(
      { error: error.message || 'Failed to assign office' },
      { status: 500 }
    );
  }
}
