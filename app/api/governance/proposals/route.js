import { createProposal, listProposals } from '@/lib/engine/governance';
import { verifySession } from '@/lib/auth/verifySession';
import { hasPermission } from '@/lib/auth/permissions';

/**
 * List governance proposals. Open to any authenticated member — governance
 * records are institutional transparency (Charter 18.12 Audit Governance).
 */
export async function GET(request) {
  try {
    const { member, error: authError } = await verifySession(request);
    if (authError || !member) {
      return Response.json({ error: authError || 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const proposals = await listProposals(status);
    return Response.json({ proposals }, { status: 200 });
  } catch (error) {
    console.error('Error listing proposals:', error);
    return Response.json({ error: 'Failed to list proposals' }, { status: 500 });
  }
}

/**
 * Create a proposal. Requires propose_governance_change (Council/Authority).
 */
export async function POST(request) {
  try {
    const { member, error: authError } = await verifySession(request);
    if (authError || !member) {
      return Response.json({ error: authError || 'Not authenticated' }, { status: 401 });
    }

    const allowed = await hasPermission(member.id, 'propose_governance_change');
    if (!allowed) {
      return Response.json(
        { error: 'You do not hold the propose_governance_change permission' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description, category } = body;

    if (!title || !description || !category) {
      return Response.json(
        { error: 'title, description, and category are required' },
        { status: 400 }
      );
    }

    const proposal = await createProposal(member.id, title, description, category);
    return Response.json({ proposal }, { status: 201 });
  } catch (error) {
    console.error('Error creating proposal:', error);
    return Response.json(
      { error: error.message || 'Failed to create proposal' },
      { status: 500 }
    );
  }
}
