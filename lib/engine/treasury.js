'use server';

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Create a payment intent for a membership plan
 * Integration point for Stripe/payment processor
 * @param {string} memberId - Member UUID
 * @param {string} planId - Membership plan UUID
 * @returns {Promise<Object>} Payment intent details
 */
export async function createPaymentIntent(memberId, planId) {
  try {
    // Get plan details
    const { data: plan, error: planError } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError) throw planError;

    // Get member details
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('id', memberId)
      .single();

    if (memberError) throw memberError;

    // If plan is free, skip payment
    if (plan.price === 0 || plan.price === null) {
      return {
        type: 'complimentary',
        planId,
        memberId,
        amount: 0,
        currency: 'usd'
      };
    }

    // TODO: Integrate with Stripe or payment processor
    // This is a placeholder for payment intent creation
    return {
      type: 'stripe',
      clientSecret: null,
      planId,
      memberId,
      amount: Math.round(plan.price * 100), // Cents
      currency: 'usd',
      description: `${plan.name} - ${plan.billing_period} subscription`
    };
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
}

/**
 * Record a successful payment
 * @param {string} subscriptionId - Subscription UUID
 * @param {string} paymentId - Payment processor ID (e.g., Stripe charge ID)
 * @param {number} amountPaid - Amount paid in cents
 * @returns {Promise<Object>} Updated subscription
 */
export async function recordPayment(subscriptionId, paymentId, amountPaid) {
  try {
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
    return subscription;
  } catch (error) {
    console.error('Error recording payment:', error);
    throw error;
  }
}

/**
 * Handle failed payment
 * @param {string} subscriptionId - Subscription UUID
 * @param {string} failureReason - Reason for failure
 * @returns {Promise<Object>} Updated subscription
 */
export async function recordPaymentFailure(subscriptionId, failureReason) {
  try {
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
    return subscription;
  } catch (error) {
    console.error('Error recording payment failure:', error);
    throw error;
  }
}

/**
 * Get payment history for a member
 * @param {string} memberId - Member UUID
 * @returns {Promise<Array>} Subscription records with payment info
 */
export async function getPaymentHistory(memberId) {
  try {
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select(`
        id,
        status,
        payment_status,
        started_at,
        expires_at,
        created_at,
        plan:plan_id (
          name,
          price,
          billing_period
        )
      `)
      .eq('member_id', memberId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return subscriptions || [];
  } catch (error) {
    console.error('Error getting payment history:', error);
    throw error;
  }
}

/**
 * Generate invoice for a subscription
 * @param {string} subscriptionId - Subscription UUID
 * @returns {Promise<Object>} Invoice details
 */
export async function generateInvoice(subscriptionId) {
  try {
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select(`
        *,
        member:member_id (id, email, name),
        plan:plan_id (name, price, billing_period)
      `)
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
  } catch (error) {
    console.error('Error generating invoice:', error);
    throw error;
  }
}

/**
 * Refund a payment
 * @param {string} subscriptionId - Subscription UUID
 * @param {string} reason - Refund reason
 * @returns {Promise<Object>} Updated subscription
 */
export async function refundPayment(subscriptionId, reason) {
  try {
    const { data: subscription, error } = await supabase
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

    // TODO: Call payment processor to issue refund
    // TODO: Log refund in audit trail

    return subscription;
  } catch (error) {
    console.error('Error refunding payment:', error);
    throw error;
  }
}
