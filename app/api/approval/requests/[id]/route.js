import { createClient } from '@supabase/supabase-js';
import { createSubscription } from '@/lib/engine/membership';
import { verifySession } from '@/lib/auth/verifySession';
import { hasPermission } from '@/lib/auth/permissions';
import { logActivity } from '@/lib/engine/activity';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Approve a membership request.
 * Charter 21.13: sensitive actions require Authentication + Permission Check + Audit Record.
 * "decidedBy" is never trusted from the request body — the acting member is
 * derived from their verified session only.
 */
export async function POST(request, { params }) {
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

    const requestId = params.id;
    const body = await request.json().catch(() => ({}));
    const { decisionNotes } = body;

    const { data: approvalRequest, error: fetchError } = await supabase
      .from('approval_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError) throw fetchError;

    if (approvalRequest.status !== 'pending') {
      return Response.json(
        { error: `Request already ${approvalRequest.status}` },
        { status: 409 }
      );
    }

    const { error: updateError } = await supabase
      .from('approval_requests')
      .update({
        status: 'approved',
        decided_at: new Date().toISOString(),
        decided_by: actingMember.id,
        decision_notes: decisionNotes || null
      })
      .eq('id', requestId);

    if (updateError) throw updateError;

    const subscription = await createSubscription(
      approvalRequest.member_id,
      approvalRequest.plan_id
    );

    await logActivity({
      memberId: actingMember.id,
      action: 'MEMBERSHIP_APPROVED',
      description: `Approved membership request ${requestId} for member ${approvalRequest.member_id}`,
      metadata: { requestId, planId: approvalRequest.plan_id, decisionNotes: decisionNotes || null }
    });

    return Response.json({ success: true, subscription }, { status: 200 });
  } catch (error) {
    console.error('Error approving membership:', error);
    return Response.json(
      { error: error.message || 'Failed to approve membership' },
      { status: 500 }
    );
  }
}

/**
 * Reject a membership request. Same auth model as POST.
 */
export async function PUT(request, { params }) {
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

    const requestId = params.id;
    const body = await request.json().catch(() => ({}));
    const { decisionNotes } = body;

    const { data: approvalRequest, error: fetchError } = await supabase
      .from('approval_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError) throw fetchError;

    if (approvalRequest.status !== 'pending') {
      return Response.json(
        { error: `Request already ${approvalRequest.status}` },
        { status: 409 }
      );
    }

    const { error } = await supabase
      .from('approval_requests')
      .update({
        status: 'rejected',
        decided_at: new Date().toISOString(),
        decided_by: actingMember.id,
        decision_notes: decisionNotes || null
      })
      .eq('id', requestId);

    if (error) throw error;

    await logActivity({
      memberId: actingMember.id,
      action: 'MEMBERSHIP_REJECTED',
      description: `Rejected membership request ${requestId}`,
      metadata: { requestId, decisionNotes: decisionNotes || null }
    });

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error rejecting membership:', error);
    return Response.json(
      { error: error.message || 'Failed to reject membership' },
      { status: 500 }
    );
  }
}
