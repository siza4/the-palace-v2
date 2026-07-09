'use server';

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Get a member's real institutional status: their Standing, whether their
 * contribution is current, their Offices, and recent contribution history.
 * Replaces the old plan/subscription-based getMembershipStatus(), which
 * checked subscriptions.status/expires_at against a purchased plan.
 *
 * Wording matches Charter 10.5 ("Correct: Your Royal Standing requires
 * renewal" — never "Your plan has expired").
 */
export async function getMembershipStatus(memberId) {
  const { data: standing, error: standingError } = await supabase
    .from('member_standing')
    .select('*, standing_levels(*)')
    .eq('member_id', memberId)
    .single();

  if (standingError) {
    return {
      standing: null,
      standingStatus: 'no_standing',
      contributionStatus: 'unknown',
      isActive: false,
      daysRemaining: null,
      offices: [],
      recentContributions: []
    };
  }

  const now = new Date();
  const expiresAt = standing.contribution_expires_at
    ? new Date(standing.contribution_expires_at)
    : null;

  // Appointed Standing (Council/Authority) has no contribution_expires_at
  // by design (Charter 10.6: never purchased, never lapses on non-payment).
  const isAppointed = standing.grant_method === 'appointment' && !expiresAt;

  let contributionStatus;
  let daysRemaining = null;

  if (isAppointed) {
    contributionStatus = 'not_applicable';
  } else if (!expiresAt) {
    contributionStatus = 'renewal_required';
  } else {
    daysRemaining = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
    if (daysRemaining > 0) {
      contributionStatus = 'active';
    } else if (daysRemaining > -7) {
      contributionStatus = 'renewal_required'; // Charter 10.9 grace state
    } else {
      contributionStatus = 'lapsed';
    }
  }

  const { data: offices } = await supabase
    .from('member_offices')
    .select('*, offices(*)')
    .eq('member_id', memberId)
    .eq('active', true);

  const { data: recentContributions } = await supabase
    .from('treasury_contributions')
    .select('*')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })
    .limit(5);

  return {
    standing: standing.standing_levels,
    standingStatus: standing.status,
    contributionStatus,
    isActive: standing.status === 'active' && contributionStatus !== 'lapsed',
    daysRemaining,
    offices: offices || [],
    recentContributions: recentContributions || []
  };
}

// --- Legacy compatibility -------------------------------------------------
// Charter 10.6 rejects plan-based membership entirely. These stubs exist so
// any lingering caller fails loudly with guidance instead of silently
// operating on a forbidden pricing-tier model.

export async function createSubscription() {
  throw new Error(
    'Deprecated: plan-based subscriptions are retired (Charter 10.6). ' +
      'Member Standing is granted automatically on admission; renewal ' +
      'happens via treasury.initiateContribution(memberId, days).'
  );
}

export async function getMembershipPlans() {
  throw new Error(
    'Deprecated: The Palace does not use pricing tiers (Charter 10.6, 21.8). ' +
      'There is nothing to list.'
  );
}

export async function renewSubscription() {
  throw new Error(
    'Deprecated: use treasury.initiateContribution(memberId, days) instead. ' +
      'Members contribute any number of days at any time (Charter 10.3).'
  );
}

export async function updateMemberAccessLevel() {
  // Intentional no-op, not an error: access_level is a legacy cached
  // column that nothing in the current permission/access system reads
  // (see lib/engine/permissions.js, chamber.service.js — both check real
  // Standing/Office/Permission, never access_level). Calling this is
  // harmless but does nothing.
  console.warn(
    'updateMemberAccessLevel() is a no-op — access levels are deprecated. Standing is contribution-based, not tier-based.'
  );
  return null;
}
