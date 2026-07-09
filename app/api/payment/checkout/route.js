import { createPaymentIntent } from '@/lib/engine/treasury';
import { verifySession } from '@/lib/auth/verifySession';

/**
 * Start a checkout for a plan. memberId is taken from the verified
 * session, never from the request body — a member can only ever create
 * a payment intent for themselves.
 */
export async function POST(request) {
  try {
    const { member, error: authError } = await verifySession(request);

    if (authError || !member) {
      return Response.json({ error: authError || 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { planId } = body;

    if (!planId) {
      return Response.json({ error: 'planId is required' }, { status: 400 });
    }

    const paymentIntent = await createPaymentIntent(member.id, planId);
    return Response.json(paymentIntent, { status: 200 });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return Response.json(
      { error: error.message || 'Failed to initialize payment' },
      { status: 500 }
    );
  }
}
