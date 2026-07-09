import { createClient } from '@supabase/supabase-js';
import { verifySession } from '@/lib/auth/verifySession';
import { hasPermission } from '@/lib/auth/permissions';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  try {
    const { member, error: authError } = await verifySession(request);
    if (authError || !member) {
      return Response.json({ error: authError || 'Not authenticated' }, { status: 401 });
    }

    const allowed = await hasPermission(member.id, 'manage_treasury');
    if (!allowed) {
      return Response.json(
        { error: 'You do not hold the manage_treasury permission' },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from('treasury_contributions')
      .select('*, members:member_id (royal_id)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    return Response.json({ contributions: data || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching contributions:', error);
    return Response.json({ error: 'Failed to fetch contributions' }, { status: 500 });
  }
}
