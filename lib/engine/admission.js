'use server';

// IMPORTANT: this file has regressed to an anon-client, RLS-blocked
// version once already (see restoration history). It must stay
// service-role. Nothing in this file should ever import
// "../supabase/client" (the anon client) — every write here goes
// through the service-role client below, the same pattern used by
// governance.js, offices.js, treasury.js, and standing.js.

import { createClient } from '@supabase/supabase-js';
import { logActivity } from './activity';
import { sendNotification } from './notifications';
import { grantInitialStanding } from './standing';

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
 * Applicant submits an admission request. No member is created here —
 * this only records the request (Charter: "No applicant becomes a
 * member before approval"). No session exists at this point, so this
 * function does its own input validation rather than relying on RLS.
 */
export async function createAdmissionRequest(form) {
  if (!form?.full_name || !form?.email || !form?.phone || !form?.country) {
    return { success: false, error: 'All fields are required.' };
  }

  const { data: request, error } = await supabase
    .from('admission_requests')
    .insert({
      full_name: form.full_name,
      email: form.email,
      phone: form.phone,
      country: form.country,
      status: 'submitted'
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: 'Could not submit admission request.' };
  }

  await logActivity({
    memberId: null,
    action: 'ADMISSION_SUBMITTED',
    description: `Admission request submitted by ${form.full_name}.`,
    metadata: { admission_request_id: request.id, email: form.email }
  });

  return { success: true, request };
}

/**
 * List admission requests, optionally filtered by status. Used by the
 * Butler admissions review queue. Access is gated at the route layer
 * (hasPermissionAndOffice), not here.
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
 * Admissions Office / Butler's Office recommendation. Does NOT create a
 * member and cannot itself approve or reject — only Authority's decide
 * step (below) can do that. Separation of powers.
 */
export async function reviewAdmissionRequest(requestId, reviewerId, recommendation, notes) {
  if (!['accept', 'reject', 'request_info'].includes(recommendation)) {
    throw new Error("recommendation must be 'accept', 'reject', or 'request_info'");
  }

  // The live admission_requests.status column has a CHECK constraint
  // permitting only: submitted, under_review, approved, rejected,
  // withdrawn — there is no 'recommended' / 'declined_by_admissions'
  // status value in the live schema. The Admissions Office's actual
  // recommendation (accept/reject/request_info) is preserved in the
  // review_recommendation column regardless; status just moves the
  // coarse-grained lifecycle from 'submitted' to 'under_review' so
  // Authority knows it's been looked at. Authority's decide step is
  // still the only thing that can set 'approved'/'rejected' — a
  // 'reject' recommendation here does not itself reject the applicant.
  const newStatus = 'under_review';

  const { data: request, error } = await supabase
    .from('admission_requests')
    .update({
      status: newStatus,
      reviewed_by: reviewerId,
      review_recommendation: recommendation,
      review_notes: notes || null,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', requestId)
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    memberId: reviewerId,
    action: 'ADMISSION_REVIEWED',
    description: `Admission request reviewed: ${recommendation}.`,
    metadata: { admission_request_id: requestId, recommendation, notes: notes || null }
  });

  return request;
}

/**
 * Authority's final, binding decision. This is the ONLY function in the
 * admission lifecycle that creates a Member. On approval: creates
 * members, member_profiles, royal_passes, and grants initial Standing —
 * the same sequence the old instant-approval flow did, just moved behind
 * the decision instead of behind submission.
 *
 * Full identity/privilege access is NOT gated by a special member
 * status here — members.status is set to 'Active' immediately on
 * approval (they are a recognized member). Contribution-gated access is
 * already handled separately and correctly by lib/engine/entry.js's
 * enterPalace(), which checks Treasury contribution status independent
 * of members.status. That existing mechanism is left untouched.
 */
export async function decideAdmissionRequest(requestId, deciderId, decision, notes) {
  if (!['approved', 'rejected'].includes(decision)) {
    throw new Error("decision must be 'approved' or 'rejected'");
  }

  const { data: request, error: fetchError } = await supabase
    .from('admission_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (fetchError || !request) {
    throw new Error('Admission request not found.');
  }

  if (decision === 'rejected') {
    const { data: updated, error } = await supabase
      .from('admission_requests')
      .update({
        status: 'rejected',
        decided_by: deciderId,
        decision: 'rejected',
        decision_notes: notes || null,
        decided_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) throw error;

    await logActivity({
      memberId: deciderId,
      action: 'ADMISSION_DECIDED',
      description: 'Admission request rejected by Authority.',
      metadata: { admission_request_id: requestId, decision: 'rejected', notes: notes || null }
    });

    return { request: updated, member: null };
  }

  // Approved: create the Member.
  const royalId = generateRoyalId();

  const { data: member, error: memberError } = await supabase
    .from('members')
    .insert({
      royal_id: royalId,
      full_name: request.full_name,
      email: request.email,
      phone: request.phone,
      country: request.country,
      membership_level: 'Citizen',
      status: 'Active'
    })
    .select()
    .single();

  if (memberError) {
    const message =
      memberError.code === '23505'
        ? 'A member already exists with that email.'
        : 'Could not create member on approval.';
    throw new Error(message);
  }

  const { error: profileError } = await supabase.from('member_profiles').insert({
    member_id: member.id,
    display_name: member.full_name,
    royal_title: 'Citizen'
  });
  if (profileError) throw new Error('Could not create member profile.');

  const { error: passError } = await supabase.from('royal_passes').insert({
    member_id: member.id,
    qr_data: royalId,
    barcode_data: royalId,
    active: true
  });
  if (passError) throw new Error('Could not create Royal Pass.');

  try {
    await grantInitialStanding(member.id);
  } catch (standingError) {
    console.error('Failed to grant initial Standing on approval:', standingError);
  }

  const { data: updatedRequest, error: updateError } = await supabase
    .from('admission_requests')
    .update({
      status: 'approved',
      decided_by: deciderId,
      decision: 'approved',
      decision_notes: notes || null,
      decided_at: new Date().toISOString(),
      member_id: member.id,
      updated_at: new Date().toISOString()
    })
    .eq('id', requestId)
    .select()
    .single();

  if (updateError) throw updateError;

  await sendNotification({
    memberId: member.id,
    title: 'Welcome to The Palace',
    message: 'Your admission has been approved. Your Royal Identity has been created.',
    type: 'system'
  });

  await logActivity({
    memberId: deciderId,
    action: 'ADMISSION_DECIDED',
    description: `Admission request approved by Authority. Member ${royalId} created.`,
    metadata: { admission_request_id: requestId, decision: 'approved', member_id: member.id, royal_id: royalId }
  });

  return { request: updatedRequest, member };
}
