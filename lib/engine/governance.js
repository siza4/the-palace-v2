'use server';

import { createClient } from '@supabase/supabase-js';
import { logActivity } from './activity';
import { getMemberOffices } from './offices';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Create a governance proposal. Charter 18.9 pipeline stage 1: Proposal.
 * Caller must already be verified to hold propose_governance_change.
 */
export async function createProposal(proposedBy, title, description, category) {
  if (!['institutional', 'constitutional'].includes(category)) {
    throw new Error(
      "category must be 'institutional' or 'constitutional' — Operational " +
        'decisions do not go through the governance pipeline (Charter 18.8: ' +
        'handled directly by the relevant Office).'
    );
  }

  const { data: proposal, error } = await supabase
    .from('governance_proposals')
    .insert({
      proposed_by: proposedBy,
      title,
      description,
      category,
      status: 'under_review'
    })
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    memberId: proposedBy,
    action: 'GOVERNANCE_PROPOSAL_CREATED',
    description: `Created ${category} proposal: ${title}`,
    metadata: { proposalId: proposal.id, category }
  });

  return proposal;
}

/**
 * Record a Council review. Charter 18.9 pipeline stage 2: Review.
 * Caller must already be verified to hold review_governance_proposal
 * AND actually hold Council Office (the permission check at the route
 * layer confirms the former; this function checks the latter, since
 * Charter 9.5/18.5 ties review specifically to Council Office, not just
 * the broader permission).
 */
export async function submitReview(proposalId, reviewerId, recommendation, comments) {
  const offices = await getMemberOffices(reviewerId);
  const holdsCouncilOffice = offices.some((o) => o.offices?.name === 'Council Office');

  if (!holdsCouncilOffice) {
    throw new Error('Only Council Office holders may review governance proposals.');
  }

  const { data: review, error } = await supabase
    .from('governance_reviews')
    .upsert(
      {
        proposal_id: proposalId,
        reviewer_id: reviewerId,
        recommendation,
        comments
      },
      { onConflict: 'proposal_id,reviewer_id' }
    )
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    memberId: reviewerId,
    action: 'GOVERNANCE_REVIEW_SUBMITTED',
    description: `Reviewed proposal ${proposalId}: ${recommendation}`,
    metadata: { proposalId, recommendation }
  });

  return review;
}

/**
 * Checks whether a proposal has met its review threshold and is eligible
 * for an Authority decision. Charter 18.8:
 *   Institutional -> "Council review + Authority approval" (>= 1 supporting review)
 *   Constitutional -> "Highest governance review" (ALL active Council
 *     Office holders must have reviewed with 'support')
 */
export async function checkReviewThreshold(proposalId) {
  const { data: proposal, error } = await supabase
    .from('governance_proposals')
    .select('*')
    .eq('id', proposalId)
    .single();

  if (error) throw error;

  const { data: reviews } = await supabase
    .from('governance_reviews')
    .select('*')
    .eq('proposal_id', proposalId);

  const supportingReviews = (reviews || []).filter((r) => r.recommendation === 'support');

  if (proposal.category === 'institutional') {
    return {
      eligible: supportingReviews.length >= 1,
      reason:
        supportingReviews.length >= 1
          ? null
          : 'Requires at least one supporting Council review.'
    };
  }

  // Constitutional: every currently active Council Office holder must support.
  const { data: councilOffice } = await supabase
    .from('offices')
    .select('id')
    .eq('name', 'Council Office')
    .single();

  const { data: councilMembers } = await supabase
    .from('member_offices')
    .select('member_id')
    .eq('office_id', councilOffice.id)
    .eq('active', true);

  const councilIds = (councilMembers || []).map((m) => m.member_id);

  if (councilIds.length === 0) {
    return {
      eligible: false,
      reason: 'No active Council Office holders exist to provide the highest governance review.'
    };
  }

  const supportingIds = new Set(supportingReviews.map((r) => r.reviewer_id));
  const allSupport = councilIds.every((id) => supportingIds.has(id));

  return {
    eligible: allSupport,
    reason: allSupport
      ? null
      : `Requires support from all ${councilIds.length} active Council Office holder(s); ${supportingIds.size} have supported so far.`
  };
}

/**
 * Final Authority decision. Charter 18.9 pipeline stage 4: Approval.
 * Caller must already be verified to hold decide_governance_proposal AND
 * Authority Office (checked here, same pattern as submitReview).
 */
export async function decideProposal(proposalId, decidedBy, decision, decisionNotes) {
  const offices = await getMemberOffices(decidedBy);
  const holdsAuthorityOffice = offices.some((o) => o.offices?.name === 'Authority Office');

  if (!holdsAuthorityOffice) {
    throw new Error('Only Authority Office holders may decide governance proposals.');
  }

  if (decision === 'approved') {
    const { eligible, reason } = await checkReviewThreshold(proposalId);
    if (!eligible) {
      throw new Error(`Cannot approve — review threshold not met. ${reason}`);
    }
  }

  const { data: existingDecision } = await supabase
    .from('governance_decisions')
    .select('id')
    .eq('proposal_id', proposalId)
    .maybeSingle();

  if (existingDecision) {
    throw new Error('This proposal has already been decided.');
  }

  const { data: decisionRecord, error } = await supabase
    .from('governance_decisions')
    .insert({
      proposal_id: proposalId,
      decided_by: decidedBy,
      decision,
      decision_notes: decisionNotes
    })
    .select()
    .single();

  if (error) throw error;

  await supabase
    .from('governance_proposals')
    .update({ status: decision, updated_at: new Date().toISOString() })
    .eq('id', proposalId);

  await logActivity({
    memberId: decidedBy,
    action: 'GOVERNANCE_DECISION_RECORDED',
    description: `${decision} proposal ${proposalId}`,
    metadata: { proposalId, decision, decisionNotes: decisionNotes || null }
  });

  return decisionRecord;
}

/**
 * Mark an approved proposal implemented, with documentation.
 * Charter 18.9 pipeline stages 5-6: Implementation -> Documentation.
 */
export async function markImplemented(proposalId, actingMemberId, documentation) {
  const { data: proposal, error: fetchError } = await supabase
    .from('governance_proposals')
    .select('*')
    .eq('id', proposalId)
    .single();

  if (fetchError) throw fetchError;

  if (proposal.status !== 'approved') {
    throw new Error('Only approved proposals can be marked implemented.');
  }

  const { data: updated, error } = await supabase
    .from('governance_proposals')
    .update({
      status: 'implemented',
      implemented_at: new Date().toISOString(),
      documentation,
      updated_at: new Date().toISOString()
    })
    .eq('id', proposalId)
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    memberId: actingMemberId,
    action: 'GOVERNANCE_PROPOSAL_IMPLEMENTED',
    description: `Marked proposal ${proposalId} implemented`,
    metadata: { proposalId }
  });

  return updated;
}

/**
 * List proposals, optionally filtered by status.
 */
export async function listProposals(status) {
  let query = supabase
    .from('governance_proposals')
    .select(
      `
      *,
      proposer:proposed_by (id, royal_id),
      governance_reviews (*),
      governance_decisions (*)
    `
    )
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}
