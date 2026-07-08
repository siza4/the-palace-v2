import { supabase } from "../supabase/client";

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

  return { data, error };

}
