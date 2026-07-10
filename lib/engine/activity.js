'use server';

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// NOTE: this file was previously built on the anon client and silently
// failed on every call, because activity_logs RLS is service-role-only
// by design (see database/004_activity_logs.sql). It has already
// regressed back to the anon client once before after being fixed —
// if you're touching this file, it must stay on the service-role
// client above. Institutional memory (Charter: "every important action
// must create an audit trail") depends on it.

export async function logActivity({
  memberId,
  action,
  description = "",
  metadata = {}
}) {
  const { data, error } = await supabase
    .from("activity_logs")
    .insert({
      member_id: memberId,
      action,
      description,
      metadata
    })
    .select()
    .single();

  if (error) {
    // A broken audit trail must not be silent — but it also shouldn't
    // take down the institutional action that triggered it (a
    // governance decision or treasury refund should still succeed even
    // if, say, activity_logs itself is briefly unavailable). Surface
    // loudly to server logs instead of throwing.
    console.error('logActivity failed:', { action, memberId, error });
  }

  return { data, error };
}
