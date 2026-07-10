'use server';

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Same fix as lib/engine/activity.js and for the same reason:
// notifications RLS (database/003_notifications.sql) only grants members
// SELECT on their own rows — there is no anon/authenticated INSERT
// policy, so the anon client this file previously used could never
// successfully create a notification.

export async function sendNotification({
  memberId,
  title,
  message,
  type = "system",
  priority = "normal",
  icon = "🔔",
  actionUrl = null
}) {
  const { data, error } = await supabase
    .from("notifications")
    .insert({
      member_id: memberId,
      title,
      message,
      type,
      priority,
      icon,
      action_url: actionUrl
    })
    .select()
    .single();

  if (error) {
    console.error('sendNotification failed:', { memberId, title, error });
  }

  return { data, error };
}
