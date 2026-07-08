import { createClient } from '@supabase/supabase-js';
import { createSubscription } from '@/lib/engine/membership';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const body = await request.json();
    const { memberId, planId } = body;

    if (!memberId || !planId) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const subscription = await createSubscription(memberId, planId);
    return Response.json(
      { subscription },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating subscription:', error);
    return Response.json(
      { error: error.message || 'Failed to create subscription' },
      { status: 500 }
    );
  }
}
