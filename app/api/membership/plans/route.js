import { createClient } from '@supabase/supabase-js';
import { getMembershipPlans } from '@/lib/engine/membership';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  try {
    const plans = await getMembershipPlans(true);
    return Response.json({ plans }, { status: 200 });
  } catch (error) {
    console.error('Error fetching plans:', error);
    return Response.json(
      { error: 'Failed to fetch membership plans' },
      { status: 500 }
    );
  }
}
