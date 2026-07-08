import { createClient } from '@supabase/supabase-js';
import { createPaymentIntent, recordPayment } from '@/lib/engine/treasury';

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

    const paymentIntent = await createPaymentIntent(memberId, planId);
    return Response.json(paymentIntent, { status: 200 });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return Response.json(
      { error: error.message || 'Failed to initialize payment' },
      { status: 500 }
    );
  }
}
