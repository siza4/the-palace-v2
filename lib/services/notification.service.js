import { supabase } from "../supabase/client";


export async function createNotification(data){

    return await supabase
    .from("notifications")
    .insert(data)
    .select()
    .single();

}


export async function getMemberNotifications(memberId){

    return await supabase
    .from("notifications")
    .select("*")
    .eq("member_id", memberId)
    .order("created_at", {
        ascending:false
    });

}
