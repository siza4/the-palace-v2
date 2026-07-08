import { createClient } from '@supabase/supabase-js';
import { createSubscription } from '@/lib/engine/membership';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Approve a membership request
 */
export async function POST(request, { params }) {
  try {
    const requestId = params.id;
    const body = await request.json();
    const { decidedBy, decisionNotes } = body;

    if (!decidedBy) {
      return Response.json(
        { error: 'decidedBy (admin member ID) is required' },
        { status: 400 }
      );
    }

    // Get approval request details
    const { data: approvalRequest, error: fetchError } = await supabase
      .from('approval_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError) throw fetchError;

    // Update approval request
    const { error: updateError } = await supabase
      .from('approval_requests')
      .update({
        status: 'approved',
        decided_at: new Date().toISOString(),
        decided_by: decidedBy,
        decision_notes: decisionNotes
      })
      .eq('id', requestId);

    if (updateError) throw updateError;

    // Create subscription for member
    const subscription = await createSubscription(
      approvalRequest.member_id,
      approvalRequest.plan_id
    );

    return Response.json(
      { success: true, subscription },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error approving membership:', error);
    return Response.json(
      { error: error.message || 'Failed to approve membership' },
      { status: 500 }
    );
  }
}

/**
 * Reject a membership request
 */
export async function PUT(request, { params }) {
  try {
    const requestId = params.id;
    const body = await request.json();
    const { decidedBy, decisionNotes } = body;

    if (!decidedBy) {
      return Response.json(
        { error: 'decidedBy (admin member ID) is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('approval_requests')
      .update({
        status: 'rejected',
        decided_at: new Date().toISOString(),
        decided_by: decidedBy,
        decision_notes: decisionNotes
      })
      .eq('id', requestId);

    if (error) throw error;

    return Response.json(
      { success: true },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error rejecting membership:', error);
    return Response.json(
      { error: error.message || 'Failed to reject membership' },
      { status: 500 }
    );
  }
}
