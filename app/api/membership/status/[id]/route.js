import { createClient } from '@supabase/supabase-js';
import { getMembershipStatus } from '@/lib/engine/membership';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request, { params }) {
  try {
    const memberId = params.id;
    const status = await getMembershipStatus(memberId);
    return Response.json(status, { status: 200 });
  } catch (error) {
    console.error('Error fetching membership status:', error);
    return Response.json(
      { error: 'Failed to fetch membership status' },
      { status: 500 }
    );
  }
}
