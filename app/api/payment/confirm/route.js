import { createClient } from '@supabase/supabase-js';
import { recordPayment } from '@/lib/engine/treasury';
import { updateSubscription } from '@/lib/engine/membership';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Webhook endpoint for payment processor (Stripe, etc)
 * Called when payment is confirmed
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { subscriptionId, paymentId, amountPaid } = body;

    if (!subscriptionId || !paymentId) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Record payment and activate subscription
    const subscription = await recordPayment(subscriptionId, paymentId, amountPaid);
    
    return Response.json(
      { success: true, subscription },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error processing payment webhook:', error);
    return Response.json(
      { error: error.message || 'Failed to process payment' },
      { status: 500 }
    );
  }
}
