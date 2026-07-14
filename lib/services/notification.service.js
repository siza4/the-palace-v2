/**
 * @deprecated Confirmed unreachable — nothing anywhere in the app
 * imports createNotification or getMemberNotifications. The live
 * notification path is lib/engine/notifications.js's
 * sendNotification(), already fixed to use the service-role client.
 * Kept per audit decision (2026-07) until the first stable Palace
 * release; scheduled for removal after that in a dedicated cleanup
 * commit, not before.
 */
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
