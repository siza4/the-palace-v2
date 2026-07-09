'use server';

import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { logActivity } from './activity';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// Charter 10.3: "The purpose of the $1/day contribution is not to create
// a paywall. It represents commitment, active participation, support of
// the institution, maintenance of membership standing."
export const CHARTER_MINIMUM_DAILY_RATE = 1.0;

/**
 * ARCHITECTURAL RULE (Charter 10.2, 10.8, 21.14 -- "Money != Authority"):
 * Nothing in this file may ever write to member_roles, member_standing's
 * standing_level_id, or member_offices. Contribution only ever extends
 * member_standing.contribution_expires_at (Member Standing renewal).
 * Circle/Council/Authority Standing are earned through
 * lib/engine/standing.js's review-gated advancement -- they are never
 * purchased (10.6: "Not simply purchased" / "Appointment only").
 */

/**
 * Start a contribution. Charter 10.3: minimum 1 day, flat rate.
 * @param {string} memberId
 * @param {number} days - number of days of Standing to secure, minimum 1
 */
export async function initiateContribution(memberId, days) {
  if (!Number.isInteger(days) || days < 1) {
    throw new Error(
      'Contribution must secure at least 1 day of Royal Standing.'
    );
  }

  const { data: member, error: memberError } = await supabase
    .from('members')
    .select('*')
    .eq('id', memberId)
    .single();

  if (memberError) throw memberError;

  const amount = Number((days * CHARTER_MINIMUM_DAILY_RATE).toFixed(2));

  const { data: contribution, error } = await supabase
    .from('treasury_contributions')
    .insert({
      member_id: memberId,
      days,
      amount,
      daily_rate: CHARTER_MINIMUM_DAILY_RATE,
      status: 'pending'
    })
    .select()
    .single();

  if (error) throw error;

  if (!stripe) {
    return {
      contributionId: contribution.id,
      type: 'unconfigured',
      amount,
      days,
      error:
        'Payments are not configured yet -- STRIPE_SECRET_KEY is not set.'
    };
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: 'usd',
    metadata: {
      type: 'standing_contribution',
      contributionId: contribution.id,
      memberId,
      days: String(days),
      royalId: member.royal_id
    },
    description: `Royal Standing contribution — ${days} day(s)`
  });

  await supabase
    .from('treasury_contributions')
    .update({ stripe_payment_intent_id: paymentIntent.id })
    .eq('id', contribution.id);

  return {
    contributionId: contribution.id,
    type: 'stripe',
    clientSecret: paymentIntent.client_secret,
    amount,
    days
  };
}

/**
 * Confirm a contribution. ONLY called from the verified Stripe webhook
 * (app/api/webhooks/stripe/route.js) using data from a signature-verified
 * Stripe event -- never from a client-supplied request body. Extends
 * Member Standing's contribution_expires_at; does not touch Standing
 * level, Office, or Permissions.
 */
export async function confirmContribution(contributionId, paymentId, amountPaid) {
  const { data: contribution, error: fetchError } = await supabase
    .from('treasury_contributions')
    .select('*')
    .eq('id', contributionId)
    .single();

  if (fetchError) throw fetchError;

  if (contribution.status === 'confirmed') {
    return contribution; // idempotent -- webhook may retry
  }

  const { data: updated, error } = await supabase
    .from('treasury_contributions')
    .update({
      status: 'confirmed',
      stripe_payment_intent_id: paymentId,
      confirmed_at: new Date().toISOString()
    })
    .eq('id', contributionId)
    .select()
    .single();

  if (error) throw error;

  const { data: standing, error: standingError } = await supabase
    .from('member_standing')
    .select('*')
    .eq('member_id', contribution.member_id)
    .single();

  if (standingError) throw standingError;

  const now = new Date();
  const currentExpiry =
    standing.contribution_expires_at && new Date(standing.contribution_expires_at) > now
      ? new Date(standing.contribution_expires_at)
      : now;

  const newExpiry = new Date(currentExpiry);
  newExpiry.setDate(newExpiry.getDate() + contribution.days);

  await supabase
    .from('member_standing')
    .update({
      contribution_expires_at: newExpiry.toISOString(),
      status: 'active',
      updated_at: now.toISOString()
    })
    .eq('member_id', contribution.member_id);

  await logActivity({
    memberId: contribution.member_id,
    action: 'CONTRIBUTION_CONFIRMED',
    description: `Contribution of ${contribution.days} day(s) confirmed`,
    metadata: { contributionId, paymentId, amountPaid, newExpiry: newExpiry.toISOString() }
  });

  return updated;
}

/**
 * Record a failed contribution attempt. Webhook-driven only.
 */
export async function recordContributionFailure(contributionId, failureReason) {
  const { data: updated, error } = await supabase
    .from('treasury_contributions')
    .update({ status: 'failed' })
    .eq('id', contributionId)
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    memberId: updated.member_id,
    action: 'CONTRIBUTION_FAILED',
    description: `Contribution failed: ${failureReason}`,
    metadata: { contributionId, failureReason }
  });

  return updated;
}

/**
 * Get a member's contribution history.
 */
export async function getContributionHistory(memberId) {
  const { data, error } = await supabase
    .from('treasury_contributions')
    .select('*')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Refund a contribution. Requires manage_treasury permission, enforced at
 * the route layer.
 */
export async function refundContribution(contributionId, actingMemberId, reason) {
  const { data: contribution, error: fetchError } = await supabase
    .from('treasury_contributions')
    .select('*')
    .eq('id', contributionId)
    .single();

  if (fetchError) throw fetchError;

  if (stripe && contribution.stripe_payment_intent_id) {
    await stripe.refunds.create({
      payment_intent: contribution.stripe_payment_intent_id
    });
  }

  const { data: updated, error } = await supabase
    .from('treasury_contributions')
    .update({ status: 'refunded' })
    .eq('id', contributionId)
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    memberId: actingMemberId,
    action: 'CONTRIBUTION_REFUNDED',
    description: `Refunded contribution ${contributionId}`,
    metadata: { contributionId, reason }
  });

  return updated;
}

// --- Legacy compatibility -------------------------------------------------
// The old plan-based functions are deprecated (Charter 10.6/21.8). Kept as
// clearly-failing stubs so any code still calling them fails loudly with a
// helpful message instead of silently selling a forbidden pricing tier.

export async function createPaymentIntent() {
  throw new Error(
    'Deprecated: membership_plans/checkout is retired (Charter 10.6 rejects tiered pricing). Use treasury.initiateContribution(memberId, days) instead.'
  );
}

export async function recordPayment() {
  throw new Error(
    'Deprecated: use treasury.confirmContribution(contributionId, paymentId, amountPaid) instead.'
  );
}

export async function refundPayment() {
  throw new Error('Deprecated: use treasury.refundContribution() instead.');
}
