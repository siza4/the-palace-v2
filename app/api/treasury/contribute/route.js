import { initiateContribution } from '@/lib/engine/treasury';
import { verifySession } from '@/lib/auth/verifySession';

/**
 * Start a Royal Standing contribution. Charter 10.3: flat $1/day, no
 * plan selection, no tiers. memberId comes from the verified session —
 * a member can only ever contribute toward their own Standing.
 */
export async function POST(request) {
  try {
    const { member, error: authError } = await verifySession(request);

    if (authError || !member) {
      return Response.json({ error: authError || 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { days } = body;

    if (!Number.isInteger(days) || days < 1) {
      return Response.json(
        { error: 'Contribution must secure at least 1 day of Royal Standing.' },
        { status: 400 }
      );
    }

    const result = await initiateContribution(member.id, days);
    return Response.json(result, { status: 200 });
  } catch (error) {
    console.error('Error initiating contribution:', error);
    return Response.json(
      { error: error.message || 'Failed to initiate contribution' },
      { status: 500 }
    );
  }
}
