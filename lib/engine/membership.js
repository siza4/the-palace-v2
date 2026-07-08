'use server';

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Create a new subscription for a member
 * @param {string} memberId - Member UUID
 * @param {string} planId - Membership plan UUID
 * @returns {Promise<Object>} Subscription object
 */
export async function createSubscription(memberId, planId) {
  try {
    // Get plan details
    const { data: plan, error: planError } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError) throw new Error(`Plan not found: ${planError.message}`);

    // Check if member has existing active subscription
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('member_id', memberId)
      .in('status', ['active', 'pending'])
      .maybeSingle();

    if (existing) {
      throw new Error('Member already has an active subscription');
    }

    // Create subscription
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .insert({
        member_id: memberId,
        plan_id: planId,
        status: plan.requires_approval ? 'pending_approval' : 'active',
        payment_status: plan.price > 0 ? 'pending' : 'complimentary',
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // Update member access level
    await updateMemberAccessLevel(memberId, plan.access_level);

    return subscription;
  } catch (error) {
    console.error('Error creating subscription:', error);
    throw error;
  }
}

/**
 * Get member's current subscription and plan details
 * @param {string} memberId - Member UUID
 * @returns {Promise<Object>} Subscription with plan details
 */
export async function getMembershipStatus(memberId) {
  try {
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select(`
        *,
        plan:plan_id (
          *
        )
      `)
      .eq('member_id', memberId)
      .order('created_at', { ascending: false })
      .maybeSingle();

    if (error) throw error;

    if (!subscription) {
      return {
        subscription: null,
        plan: null,
        isActive: false,
        status: 'no_subscription'
      };
    }

    // Check if subscription is expired
    const isExpired = subscription.expires_at && 
      new Date(subscription.expires_at) < new Date();
    const isActive = subscription.status === 'active' && !isExpired;

    return {
      subscription,
      plan: subscription.plan,
      isActive,
      status: subscription.status,
      daysRemaining: subscription.expires_at ? 
        Math.floor((new Date(subscription.expires_at) - new Date()) / (1000 * 60 * 60 * 24)) : null
    };
  } catch (error) {
    console.error('Error getting membership status:', error);
    throw error;
  }
}

/**
 * Update subscription details
 * @param {string} subscriptionId - Subscription UUID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated subscription
 */
export async function updateSubscription(subscriptionId, updates) {
  try {
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionId)
      .select()
      .single();

    if (error) throw error;
    return subscription;
  } catch (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }
}

/**
 * Renew an expiring subscription
 * @param {string} subscriptionId - Subscription UUID
 * @param {number} months - Number of months to renew
 * @returns {Promise<Object>} Renewed subscription
 */
export async function renewSubscription(subscriptionId, months = 1) {
  try {
    const now = new Date();
    const newExpiryDate = new Date(now.getFullYear(), now.getMonth() + months, now.getDate());

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        payment_status: 'paid',
        expires_at: newExpiryDate.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionId)
      .select()
      .single();

    if (error) throw error;
    return subscription;
  } catch (error) {
    console.error('Error renewing subscription:', error);
    throw error;
  }
}

/**
 * Cancel a subscription
 * @param {string} subscriptionId - Subscription UUID
 * @param {string} reason - Cancellation reason
 * @returns {Promise<Object>} Cancelled subscription
 */
export async function cancelSubscription(subscriptionId, reason = null) {
  try {
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionId)
      .select()
      .single();

    if (error) throw error;

    // Update member back to visitor level
    if (subscription) {
      await updateMemberAccessLevel(subscription.member_id, 1);
    }

    return subscription;
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    throw error;
  }
}

/**
 * Update member access level based on subscription
 * @param {string} memberId - Member UUID
 * @param {number} accessLevel - New access level
 * @returns {Promise<Object>} Updated member
 */
export async function updateMemberAccessLevel(memberId, accessLevel) {
  try {
    const { data: member, error } = await supabase
      .from('members')
      .update({
        access_level: accessLevel,
        updated_at: new Date().toISOString()
      })
      .eq('id', memberId)
      .select()
      .single();

    if (error) throw error;
    return member;
  } catch (error) {
    console.error('Error updating member access level:', error);
    throw error;
  }
}

/**
 * Get all membership plans
 * @param {boolean} activeOnly - Only return active plans
 * @returns {Promise<Array>} Membership plans
 */
export async function getMembershipPlans(activeOnly = true) {
  try {
    let query = supabase
      .from('membership_plans')
      .select('*')
      .order('access_level', { ascending: true });

    if (activeOnly) {
      query = query.eq('active', true);
    }

    const { data: plans, error } = await query;
    if (error) throw error;
    return plans || [];
  } catch (error) {
    console.error('Error getting membership plans:', error);
    throw error;
  }
}

/**
 * Check if subscription is expiring soon
 * @param {string} subscriptionId - Subscription UUID
 * @param {number} daysThreshold - Days until expiry to consider "soon"
 * @returns {Promise<boolean>} True if expiring soon
 */
export async function isExpiringSoon(subscriptionId, daysThreshold = 7) {
  try {
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('expires_at')
      .eq('id', subscriptionId)
      .single();

    if (error) throw error;
    if (!subscription || !subscription.expires_at) return false;

    const expiryDate = new Date(subscription.expires_at);
    const today = new Date();
    const daysUntilExpiry = Math.floor((expiryDate - today) / (1000 * 60 * 60 * 24));

    return daysUntilExpiry <= daysThreshold && daysUntilExpiry > 0;
  } catch (error) {
    console.error('Error checking expiry:', error);
    throw error;
  }
}
