'use server';

import { createClient } from '@supabase/supabase-js';
import { logActivity } from './activity';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Grant a member's baseline Standing on admission.
 * Per Charter §12.2/§12.4, Member Standing is auto-granted once identity
 * is established and contribution is confirmed — this is the ONLY point
 * in the system where Standing is granted without review.
 */
export async function grantInitialStanding(memberId) {
  const { data: memberLevel, error: levelError } = await supabase
    .from('standing_levels')
    .select('*')
    .eq('name', 'Member Standing')
    .single();

  if (levelError) throw levelError;

  const { data: standing, error } = await supabase
    .from('member_standing')
    .insert({
      member_id: memberId,
      standing_level_id: memberLevel.id,
      status: 'active',
      grant_method: 'automatic'
    })
    .select()
    .single();

  if (error) throw error;

  await supabase.from('standing_history').insert({
    member_id: memberId,
    from_standing_id: null,
    to_standing_id: memberLevel.id,
    change_type: 'granted',
    changed_by: null,
    reason: 'Automatic grant on admission (Charter §12.4)'
  });

  return standing;
}

/**
 * Get a member's current Standing, joined with the level details.
 */
export async function getCurrentStanding(memberId) {
  const { data, error } = await supabase
    .from('member_standing')
    .select('*, standing_levels(*)')
    .eq('member_id', memberId)
    .single();

  if (error) return null;
  return data;
}

/**
 * Request advancement to Circle/Council/Authority Standing.
 * This creates a request for review — it does NOT grant anything.
 * Per §12.10: Advancement = Contribution + Time + Trust + Responsibility,
 * never money alone, so this function deliberately has no path that
 * results in an immediate grant.
 */
export async function requestStandingAdvancement(memberId, requestedStandingName, reason) {
  const { data: level, error: levelError } = await supabase
    .from('standing_levels')
    .select('*')
    .eq('name', requestedStandingName)
    .single();

  if (levelError) throw levelError;

  if (level.auto_grantable) {
    throw new Error(
      `${requestedStandingName} does not require a review request.`
    );
  }

  const { data: request, error } = await supabase
    .from('standing_advancement_requests')
    .insert({
      member_id: memberId,
      requested_standing_id: level.id,
      reason,
      status: 'pending'
    })
    .select()
    .single();

  if (error) throw error;
  return request;
}

/**
 * Decide a Standing advancement request. Caller (actingMemberId) must
 * already be verified to hold the manage_standing permission — this
 * function assumes that check happened at the route/permission layer,
 * consistent with how approval_requests is handled.
 */
export async function decideStandingAdvancement(requestId, actingMemberId, approve, decisionNotes) {
  const { data: request, error: fetchError } = await supabase
    .from('standing_advancement_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (fetchError) throw fetchError;

  if (request.status !== 'pending') {
    throw new Error(`Request already ${request.status}`);
  }

  const { error: updateError } = await supabase
    .from('standing_advancement_requests')
    .update({
      status: approve ? 'approved' : 'rejected',
      decided_at: new Date().toISOString(),
      decided_by: actingMemberId,
      decision_notes: decisionNotes || null
    })
    .eq('id', requestId);

  if (updateError) throw updateError;

  if (!approve) {
    await logActivity({
      memberId: actingMemberId,
      action: 'STANDING_ADVANCEMENT_REJECTED',
      description: `Rejected Standing advancement request ${requestId}`,
      metadata: { requestId, decisionNotes: decisionNotes || null }
    });
    return { approved: false };
  }

  const { data: currentStanding, error: currentError } = await supabase
    .from('member_standing')
    .select('*')
    .eq('member_id', request.member_id)
    .single();

  if (currentError) throw currentError;

  const { error: advanceError } = await supabase
    .from('member_standing')
    .update({
      standing_level_id: request.requested_standing_id,
      granted_at: new Date().toISOString(),
      granted_by: actingMemberId,
      grant_method: 'review',
      notes: decisionNotes || null,
      updated_at: new Date().toISOString()
    })
    .eq('member_id', request.member_id);

  if (advanceError) throw advanceError;

  await supabase.from('standing_history').insert({
    member_id: request.member_id,
    from_standing_id: currentStanding.standing_level_id,
    to_standing_id: request.requested_standing_id,
    change_type: 'advanced',
    changed_by: actingMemberId,
    reason: decisionNotes || null
  });

  await logActivity({
    memberId: actingMemberId,
    action: 'STANDING_ADVANCED',
    description: `Advanced member ${request.member_id} Standing via request ${requestId}`,
    metadata: { requestId, decisionNotes: decisionNotes || null }
  });

  return { approved: true };
}

/**
 * Suspend a member's Standing. Per §12.12, this preserves history —
 * it does not delete or downgrade the standing_level_id, only the status.
 */
export async function suspendStanding(memberId, actingMemberId, reason) {
  const { data: current, error: currentError } = await supabase
    .from('member_standing')
    .select('*')
    .eq('member_id', memberId)
    .single();

  if (currentError) throw currentError;

  const { error } = await supabase
    .from('member_standing')
    .update({ status: 'suspended', updated_at: new Date().toISOString() })
    .eq('member_id', memberId);

  if (error) throw error;

  await supabase.from('standing_history').insert({
    member_id: memberId,
    from_standing_id: current.standing_level_id,
    to_standing_id: current.standing_level_id,
    change_type: 'suspended',
    changed_by: actingMemberId,
    reason
  });

  await logActivity({
    memberId: actingMemberId,
    action: 'STANDING_SUSPENDED',
    description: `Suspended Standing for member ${memberId}`,
    metadata: { reason }
  });
}

/**
 * Restore a suspended member's Standing (§12.13).
 */
export async function restoreStanding(memberId, actingMemberId, reason) {
  const { data: current, error: currentError } = await supabase
    .from('member_standing')
    .select('*')
    .eq('member_id', memberId)
    .single();

  if (currentError) throw currentError;

  const { error } = await supabase
    .from('member_standing')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('member_id', memberId);

  if (error) throw error;

  await supabase.from('standing_history').insert({
    member_id: memberId,
    from_standing_id: current.standing_level_id,
    to_standing_id: current.standing_level_id,
    change_type: 'restored',
    changed_by: actingMemberId,
    reason
  });

  await logActivity({
    memberId: actingMemberId,
    action: 'STANDING_RESTORED',
    description: `Restored Standing for member ${memberId}`,
    metadata: { reason }
  });
}
