import { supabaseService } from "../supabase/serviceClient";

// Service-role client — notifications has RLS enabled with a SELECT-only
// policy and no INSERT policy (confirmed via live pg_policies query).
export async function sendNotification({

  memberId,
  title,
  message,
  type = "system",
  priority = "normal",
  icon = "🔔",
  actionUrl = null

}) {

  const { data, error } = await supabaseService

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

  return { data, error };

}
