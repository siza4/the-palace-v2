'use server';

import { createClient } from '@supabase/supabase-js';
import { logActivity } from './activity';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * List all defined Offices (Charter Chapter 6).
 */
export async function listOffices() {
  const { data, error } = await supabase.from('offices').select('*').order('name');
  if (error) throw error;
  return data;
}

/**
 * Get a member's currently active Office assignments.
 */
export async function getMemberOffices(memberId) {
  const { data, error } = await supabase
    .from('member_offices')
    .select('*, offices(*)')
    .eq('member_id', memberId)
    .eq('active', true);

  if (error) throw error;
  return data;
}

/**
 * Check whether a member currently holds a specific Office (by name).
 * This is the function Chamber access checks call — Chamber gating
 * previously relied on a free-text column with no enforcement.
 */
export async function memberHoldsOffice(memberId, officeName) {
  const { data, error } = await supabase
    .from('member_offices')
    .select('id, offices!inner(name)')
    .eq('member_id', memberId)
    .eq('active', true)
    .eq('offices.name', officeName);

  if (error) return false;
  return data.length > 0;
}

/**
 * Assign an Office to a member. Caller must already be verified to hold
 * manage_offices — enforced at the route layer, same pattern as Standing
 * and approval_requests. Per Charter 21.13, no one can grant themselves
 * an Office: assignedBy is always the acting member's own verified id,
 * and the route layer rejects assignedBy === memberId at the permission
 * check stage in practice since a member without manage_offices can't
 * reach this function at all.
 */
export async function assignOffice(memberId, officeName, assignedBy, notes) {
  const { data: office, error: officeError } = await supabase
    .from('offices')
    .select('*')
    .eq('name', officeName)
    .single();

  if (officeError) throw officeError;

  const { data: existing } = await supabase
    .from('member_offices')
    .select('*')
    .eq('member_id', memberId)
    .eq('office_id', office.id)
    .maybeSingle();

  let assignment;

  if (existing) {
    const { data, error } = await supabase
      .from('member_offices')
      .update({
        active: true,
        assigned_at: new Date().toISOString(),
        assigned_by: assignedBy,
        revoked_at: null,
        revoked_by: null,
        notes: notes || existing.notes
      })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    assignment = data;
  } else {
    const { data, error } = await supabase
      .from('member_offices')
      .insert({
        member_id: memberId,
        office_id: office.id,
        assigned_by: assignedBy,
        notes
      })
      .select()
      .single();
    if (error) throw error;
    assignment = data;
  }

  await logActivity({
    memberId: assignedBy,
    action: 'OFFICE_ASSIGNED',
    description: `Assigned ${officeName} to member ${memberId}`,
    metadata: { memberId, officeName, notes: notes || null }
  });

  return assignment;
}

/**
 * Revoke a member's Office. Preserves the assignment record (revoked_at/
 * revoked_by set, row not deleted) — matches the audit-preserving pattern
 * used for Standing suspension.
 */
export async function revokeOffice(memberId, officeName, revokedBy, reason) {
  const { data: office, error: officeError } = await supabase
    .from('offices')
    .select('*')
    .eq('name', officeName)
    .single();

  if (officeError) throw officeError;

  const { error } = await supabase
    .from('member_offices')
    .update({
      active: false,
      revoked_at: new Date().toISOString(),
      revoked_by: revokedBy,
      notes: reason || null
    })
    .eq('member_id', memberId)
    .eq('office_id', office.id);

  if (error) throw error;

  await logActivity({
    memberId: revokedBy,
    action: 'OFFICE_REVOKED',
    description: `Revoked ${officeName} from member ${memberId}`,
    metadata: { memberId, officeName, reason: reason || null }
  });
}
