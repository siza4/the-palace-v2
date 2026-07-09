import Stripe from 'stripe';
import { recordPayment, recordPaymentFailure } from '@/lib/engine/treasury';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

/**
 * Stripe webhook endpoint. This is the ONLY route that can ever mark a
 * subscription as paid — and it only does so after verifying the request
 * was genuinely signed by Stripe using STRIPE_WEBHOOK_SECRET.
 *
 * Replaces the previous /api/payment/confirm route, which accepted
 * subscriptionId/paymentId/amountPaid as plain, unverified POST body
 * fields — meaning anyone could activate any subscription (including a
 * Palace Authority tier plan) for free by posting a fabricated payment id.
 * That is the literal, concrete version of the Charter's named anti-pattern:
 * "Payment -> Authority Granted" (21.14).
 */
export async function POST(request) {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return Response.json(
      { error: 'Stripe is not configured on this deployment.' },
      { status: 501 }
    );
  }

  const signature = request.headers.get('stripe-signature');
  const rawBody = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object;
        const { subscriptionId } = await resolveSubscription(intent);
        if (subscriptionId) {
          await recordPayment(subscriptionId, intent.id, intent.amount_received);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const intent = event.data.object;
        const { subscriptionId } = await resolveSubscription(intent);
        if (subscriptionId) {
          await recordPaymentFailure(
            subscriptionId,
            intent.last_payment_error?.message || 'Payment failed'
          );
        }
        break;
      }

      default:
        // Unhandled event types are fine to ignore.
        break;
    }

    return Response.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Error processing Stripe webhook:', error);
    return Response.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

/**
 * A PaymentIntent doesn't carry a subscriptionId natively — we need to
 * look up the pending subscription that matches the memberId/planId
 * metadata set when the intent was created in createPaymentIntent().
 */
async function resolveSubscription(paymentIntent) {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const memberId = paymentIntent.metadata?.memberId;
  const planId = paymentIntent.metadata?.planId;

  if (!memberId || !planId) return { subscriptionId: null };

  const { data } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('member_id', memberId)
    .eq('plan_id', planId)
    .in('status', ['pending', 'pending_approval'])
    .order('created_at', { ascending: false })
    .maybeSingle();

  return { subscriptionId: data?.id || null };
}
