'use server';

import { createClient } from '@supabase/supabase-js';
import { createMember } from '../services/member.service';
import { createRoyalPass } from '../services/pass.service';
import { initializeProfile } from './profile';
import { grantInitialStanding } from './standing';
import { sendNotification } from './notifications';
import { logActivity } from './activity';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function generateRoyalId() {
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `PLC-${year}-${random}`;
}

/**
 * Stage one of admission: a visitor submits an Admission Request.
 * This does NOT create a member, identity, pass, or Standing — Milestone 2
 * moves identity creation behind Butler approval (Charter: exclusivity
 * means filling in a form is not the same as being admitted).
 *
 * Automatic validation only (required fields, one active application per
 * email) — the Butler should spend their attention judging suitability,
 * not rejecting malformed forms.
 */
export async function requestAdmission(form) {
  if (!form?.full_name || !form?.email) {
    return {
      success: false,
      error: { message: 'Full name and email are required' }
    };
  }

  const { data: request, error } = await supabase
    .from('admission_requests')
    .insert({
      full_name: form.full_name,
      email: form.email,
      phone: form.phone || null,
      country: form.country || null,
      applicant_notes: form.notes || null,
      status: 'submitted'
    })
    .select()
    .single();

  if (error) {
    // Postgres unique_violation on the active-email partial index
    if (error.code === '23505') {
      return {
        success: false,
        error: { message: 'An application from this email is already under review' }
      };
    }
    return { success: false, error };
  }

  await logActivity({
    memberId: null,
    action: 'ADMISSION_REQUEST_SUBMITTED',
    description: `Admission request submitted by ${form.full_name}`,
    metadata: { requestId: request.id, email: form.email }
  });

  return { success: true, request };
}

/**
 * List Admission Requests, optionally filtered by status.
 * Used by the Butler's Office Admissions queue.
 */
export async function listAdmissionRequests(status) {
  let query = supabase
    .from('admission_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/**
 * Butler Investigation: move a request from submitted to under_review.
 * Caller must already hold approve_membership — enforced at the route layer.
 */
export async function markUnderReview(requestId, actingMemberId) {
  const { data: request, error: fetchError } = await supabase
    .from('admission_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (fetchError) throw fetchError;

  if (!['submitted', 'under_review'].includes(request.status)) {
    throw new Error(`Request already ${request.status}`);
  }

  const { error } = await supabase
    .from('admission_requests')
    .update({
      status: 'under_review',
      reviewed_by: actingMemberId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', requestId);

  if (error) throw error;

  await logActivity({
    memberId: actingMemberId,
    action: 'ADMISSION_REQUEST_UNDER_REVIEW',
    description: `Admission request ${requestId} moved to review`,
    metadata: { requestId }
  });

  return { status: 'under_review' };
}

/**
 * Record that the Butler asked the applicant for more information.
 * Note: there is no outbound email/notification channel wired here yet —
 * the applicant has no session or member row to notify. This records the
 * request as institutional history (review_notes) so the Butler team has
 * shared context; sending the applicant an actual message is future work
 * once an email integration exists.
 */
export async function requestMoreInformation(requestId, actingMemberId, message) {
  const { data: request, error: fetchError } = await supabase
    .from('admission_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (fetchError) throw fetchError;

  if (['approved', 'rejected', 'withdrawn'].includes(request.status)) {
    throw new Error(`Request already ${request.status}`);
  }

  const { error } = await supabase
    .from('admission_requests')
    .update({
      status: 'under_review',
      review_notes: message || null,
      reviewed_by: actingMemberId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', requestId);

  if (error) throw error;

  await logActivity({
    memberId: actingMemberId,
    action: 'ADMISSION_INFO_REQUESTED',
    description: `More information requested on admission request ${requestId}`,
    metadata: { requestId, message: message || null }
  });

  return { status: 'under_review' };
}

/**
 * Decision stage. Reject just closes the request. Approve is where
 * identity actually gets created — the exact sequence that used to run
 * unconditionally in requestAdmission(), now gated behind this decision:
 * createMember -> generateRoyalId -> initializeProfile -> createRoyalPass
 * -> grantInitialStanding -> welcome notification.
 *
 * Caller (actingMemberId) must already be verified to hold
 * approve_membership — enforced at the route layer, consistent with how
 * decideStandingAdvancement() is handled in lib/engine/standing.js.
 */
export async function decideAdmission(requestId, actingMemberId, approve, decisionReason) {
  const { data: request, error: fetchError } = await supabase
    .from('admission_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (fetchError) throw fetchError;

  if (!['submitted', 'under_review'].includes(request.status)) {
    throw new Error(`Request already ${request.status}`);
  }

  if (!approve) {
    const { error } = await supabase
      .from('admission_requests')
      .update({
        status: 'rejected',
        decided_by: actingMemberId,
        decided_at: new Date().toISOString(),
        decision_reason: decisionReason || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (error) throw error;

    await logActivity({
      memberId: actingMemberId,
      action: 'ADMISSION_REJECTED',
      description: `Rejected admission request ${requestId}`,
      metadata: { requestId, decisionReason: decisionReason || null }
    });

    return { approved: false };
  }

  // --- Approval: this is the only place a member/identity gets created ---
  const royalId = generateRoyalId();

  const { data: member, error: memberError } = await createMember({
    royal_id: royalId,
    full_name: request.full_name,
    email: request.email,
    phone: request.phone,
    country: request.country,
    status: 'Active'
  });

  if (memberError) throw memberError;

  const { error: profileError } = await initializeProfile(member);
  if (profileError) throw profileError;

  const { error: passError } = await createRoyalPass({
    memberId: member.id,
    royalId
  });
  if (passError) throw passError;

  try {
    await grantInitialStanding(member.id);
  } catch (standingError) {
    console.error('Failed to grant initial Standing:', standingError);
  }

  const { error: decideError } = await supabase
    .from('admission_requests')
    .update({
      status: 'approved',
      decided_by: actingMemberId,
      decided_at: new Date().toISOString(),
      decision_reason: decisionReason || null,
      created_member_id: member.id,
      updated_at: new Date().toISOString()
    })
    .eq('id', requestId);

  if (decideError) throw decideError;

  await sendNotification({
    memberId: member.id,
    title: 'Welcome to The Palace',
    message: 'Your Royal Identity has been successfully created.',
    type: 'system'
  });

  await logActivity({
    memberId: actingMemberId,
    action: 'ADMISSION_APPROVED',
    description: `Approved admission request ${requestId}, created member ${member.id}`,
    metadata: { requestId, royalId }
  });

  return { approved: true, member };
}
