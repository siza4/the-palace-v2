import Stripe from 'stripe';
import { confirmContribution, recordContributionFailure } from '@/lib/engine/treasury';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

/**
 * Stripe webhook endpoint. This is the ONLY route that can ever confirm a
 * Royal Standing contribution — it only does so after verifying the
 * request was genuinely signed by Stripe using STRIPE_WEBHOOK_SECRET.
 *
 * Updated for the Charter 10.3 contribution model (migration 027) — no
 * longer processes plan/subscription payments, only standing_contribution
 * type PaymentIntents created by treasury.initiateContribution().
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
        if (intent.metadata?.type !== 'standing_contribution') break;

        const contributionId = intent.metadata?.contributionId;
        if (contributionId) {
          await confirmContribution(contributionId, intent.id, intent.amount_received / 100);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const intent = event.data.object;
        if (intent.metadata?.type !== 'standing_contribution') break;

        const contributionId = intent.metadata?.contributionId;
        if (contributionId) {
          await recordContributionFailure(
            contributionId,
            intent.last_payment_error?.message || 'Payment failed'
          );
        }
        break;
      }

      default:
        break;
    }

    return Response.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Error processing Stripe webhook:', error);
    return Response.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
