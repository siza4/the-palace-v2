import { createClient } from '@supabase/supabase-js';
import { verifySession } from '@/lib/auth/verifySession';
import { hasPermission } from '@/lib/auth/permissions';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Get all approval requests. Contains member emails/names — requires
 * approve_membership permission. Previously public with zero auth.
 */
export async function GET(request) {
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';

    const { data: requests, error } = await supabase
      .from('approval_requests')
      .select(
        `
        *,
        member:member_id (id, name, email),
        plan:plan_id (name, description, access_level)
      `
      )
      .eq('status', status)
      .order('requested_at', { ascending: false });

    if (error) throw error;

    return Response.json({ requests }, { status: 200 });
  } catch (error) {
    console.error('Error fetching approval requests:', error);
    return Response.json(
      { error: 'Failed to fetch approval requests' },
      { status: 500 }
    );
  }
}

/**
 * Create approval request. Left open — any member requesting an upgrade
 * for themselves is expected/normal, not a privileged action. The member
 * being requested-for is still tied to memberId in the body since this is
 * a self-initiated application, not a decision.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { memberId, planId, reason } = body;

    if (!memberId || !planId) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data: approvalRequest, error } = await supabase
      .from('approval_requests')
      .insert({
        member_id: memberId,
        plan_id: planId,
        reason,
        status: 'pending',
        requested_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return Response.json({ approvalRequest }, { status: 201 });
  } catch (error) {
    console.error('Error creating approval request:', error);
    return Response.json(
      { error: error.message || 'Failed to create approval request' },
      { status: 500 }
    );
  }
}
