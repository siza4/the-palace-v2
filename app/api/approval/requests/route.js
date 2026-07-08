import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Get all approval requests
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';

    let query = supabase
      .from('approval_requests')
      .select(`
        *,
        member:member_id (id, name, email),
        plan:plan_id (name, description, access_level)
      `)
      .eq('status', status)
      .order('requested_at', { ascending: false });

    const { data: requests, error } = await query;

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
 * Create approval request
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

    return Response.json(
      { approvalRequest },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating approval request:', error);
    return Response.json(
      { error: error.message || 'Failed to create approval request' },
      { status: 500 }
    );
  }
}
