import { requestStandingAdvancement, getCurrentStanding, listAdvancementRequests } from '@/lib/engine/standing';
import { verifySession } from '@/lib/auth/verifySession';
import { hasPermission } from '@/lib/auth/permissions';

/**
 * A member requests advancement to Circle/Council/Authority Standing.
 * Self-initiated, like applying — not a decision. The decision happens
 * in /api/standing/advance/[id].
 */
export async function POST(request) {
  try {
    const { member, error: authError } = await verifySession(request);

    if (authError || !member) {
      return Response.json({ error: authError || 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { requestedStanding, reason } = body;

    if (!requestedStanding) {
      return Response.json({ error: 'requestedStanding is required' }, { status: 400 });
    }

    const advancementRequest = await requestStandingAdvancement(
      member.id,
      requestedStanding,
      reason
    );

    return Response.json({ advancementRequest }, { status: 201 });
  } catch (error) {
    console.error('Error requesting Standing advancement:', error);
    return Response.json(
      { error: error.message || 'Failed to request advancement' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/standing/advance -> the caller's own current Standing.
 * GET /api/standing/advance?all=true&status=pending -> the full review
 * queue, requires manage_standing (used by the Butler's Office UI).
 */
export async function GET(request) {
  try {
    const { member, error: authError } = await verifySession(request);

    if (authError || !member) {
      return Response.json({ error: authError || 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    if (searchParams.get('all') === 'true') {
      const allowed = await hasPermission(member.id, 'manage_standing');
      if (!allowed) {
        return Response.json(
          { error: 'You do not hold the manage_standing permission' },
          { status: 403 }
        );
      }

      const requests = await listAdvancementRequests(searchParams.get('status') || 'pending');
      return Response.json({ requests }, { status: 200 });
    }

    const standing = await getCurrentStanding(member.id);
    return Response.json({ standing }, { status: 200 });
  } catch (error) {
    console.error('Error fetching Standing:', error);
    return Response.json({ error: 'Failed to fetch Standing' }, { status: 500 });
  }
}
