import { supabase } from "../supabase/client";

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

  return { data, error };
}
