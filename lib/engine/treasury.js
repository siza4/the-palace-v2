'use server';

import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { logActivity } from './activity';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Stripe is only initialized if a real secret key is configured. Previously
// this whole module was a stub that silently returned clientSecret: null —
// callers had no way to tell "not configured" apart from "working, no
// client secret needed." Now it fails loudly instead.
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

/**
 * ARCHITECTURAL RULE (Charter 21.14, "Payment -> Authority Granted" is the
 * one anti-pattern the Charter calls out by name):
 *
 * Nothing in this file may ever write to member_roles, member_standing,
 * or member_offices. Payment only ever grants product/Chamber access
 * (subscriptions.status, members.access_level, member_chambers rows).
 * Standing is earned via lib/engine/standing.js (review-gated). Offices
 * are assigned via lib/engine/offices.js (permission-gated). If you find
 * yourself wanting to grant a role/Standing/Office from in here, stop —
 * that decision belongs in an approval/review flow, not a payment
 * confirmation.
 */

/**
 * Create a real Stripe PaymentIntent for a membership plan.
 * @param {string} memberId - Member UUID
 * @param {string} planId - Membership plan UUID
 * @returns {Promise<Object>} Payment intent details
 */
export async function createPaymentIntent(memberId, planId) {
  const { data: plan, error: planError } = await supabase
    .from('membership_plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (planError) throw planError;

  const { data: member, error: memberError } = await supabase
    .from('members')
    .select('*')
    .eq('id', memberId)
    .single();

  if (memberError) throw memberError;

  if (plan.price === 0 || plan.price === null) {
    return {
      type: 'complimentary',
      planId,
      memberId,
      amount: 0,
      currency: 'usd'
    };
  }

  if (!stripe) {
    throw new Error(
      'Payments are not configured yet — STRIPE_SECRET_KEY is not set. ' +
        'This plan requires payment and cannot be activated without it.'
    );
  }

  const amountCents = Math.round(plan.price * 100);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'usd',
    metadata: {
      memberId,
      planId,
      royalId: member.royal_id
    },
    description: `${plan.name} - ${plan.billing_period} subscription`
  });

  return {
    type: 'stripe',
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    planId,
    memberId,
    amount: amountCents,
    currency: 'usd',
    description: `${plan.name} - ${plan.billing_period} subscription`
  };
}

/**
 * Record a successful payment. ONLY called from the verified Stripe
 * webhook handler (app/api/webhooks/stripe/route.js) — paymentId and
 * amountPaid must come from a Stripe event that passed signature
 * verification, never from a client-supplied request body. The previous
 * /api/payment/confirm route accepted these as plain POST body fields
 * with zero verification, which meant anyone could activate any
 * subscription — including a Palace Authority tier plan — by posting a
 * fabricated payment id. That route has been removed.
 */
export async function recordPayment(subscriptionId, paymentId, amountPaid) {
  const now = new Date();
  const expiryDate = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      payment_status: 'paid',
      stripe_subscription_id: paymentId,
      expires_at: expiryDate.toISOString(),
      started_at: now.toISOString(),
      updated_at: now.toISOString()
    })
    .eq('id', subscriptionId)
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    memberId: subscription.member_id,
    action: 'PAYMENT_RECORDED',
    description: `Payment ${paymentId} recorded for subscription ${subscriptionId}`,
    metadata: { subscriptionId, paymentId, amountPaid }
  });

  return subscription;
}

/**
 * Handle a failed payment. Also webhook-driven only.
 */
export async function recordPaymentFailure(subscriptionId, failureReason) {
  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .update({
      payment_status: 'failed',
      status: 'pending',
      updated_at: new Date().toISOString()
    })
    .eq('id', subscriptionId)
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    memberId: subscription.member_id,
    action: 'PAYMENT_FAILED',
    description: `Payment failed for subscription ${subscriptionId}: ${failureReason}`,
    metadata: { subscriptionId, failureReason }
  });

  return subscription;
}

/**
 * Get payment history for a member.
 */
export async function getPaymentHistory(memberId) {
  const { data: subscriptions, error } = await supabase
    .from('subscriptions')
    .select(
      `
      id,
      status,
      payment_status,
      started_at,
      expires_at,
      created_at,
      plan:plan_id ( name, price, billing_period )
    `
    )
    .eq('member_id', memberId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return subscriptions || [];
}

/**
 * Generate an invoice for a subscription.
 */
export async function generateInvoice(subscriptionId) {
  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select(
      `
      *,
      member:member_id (id, email, name),
      plan:plan_id (name, price, billing_period)
    `
    )
    .eq('id', subscriptionId)
    .single();

  if (subError) throw subError;

  return {
    invoiceId: `INV-${subscription.id.slice(0, 8).toUpperCase()}`,
    member: subscription.member,
    plan: subscription.plan,
    amount: subscription.plan.price,
    currency: 'usd',
    dateIssued: new Date().toISOString(),
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    status: subscription.payment_status === 'paid' ? 'paid' : 'pending'
  };
}

/**
 * Refund a payment. Caller must already be verified to hold the
 * manage_treasury permission — enforced at the route layer
 * (app/api/treasury/refund/route.js), same pattern as Standing/Offices.
 */
export async function refundPayment(subscriptionId, actingMemberId, reason) {
  const { data: subscription, error: fetchError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('id', subscriptionId)
    .single();

  if (fetchError) throw fetchError;

  if (stripe && subscription.stripe_subscription_id) {
    await stripe.refunds.create({
      payment_intent: subscription.stripe_subscription_id
    });
  }

  const { data: updated, error } = await supabase
    .from('subscriptions')
    .update({
      payment_status: 'refunded',
      status: 'cancelled',
      updated_at: new Date().toISOString()
    })
    .eq('id', subscriptionId)
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    memberId: actingMemberId,
    action: 'PAYMENT_REFUNDED',
    description: `Refunded subscription ${subscriptionId}`,
    metadata: { subscriptionId, reason }
  });

  return updated;
}
