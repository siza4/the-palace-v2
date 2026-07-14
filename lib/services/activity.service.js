/**
 * @deprecated Confirmed unreachable — nothing anywhere in the app
 * imports createActivity or getMemberActivity. The live activity-log
 * path is lib/engine/activity.js's logActivity(). Kept per audit
 * decision (2026-07) until the first stable Palace release; scheduled
 * for removal after that in a dedicated cleanup commit, not before.
 */
import { supabase } from "../supabase/client";


export async function createActivity(data){

    return await supabase
    .from("activity_logs")
    .insert(data)
    .select()
    .single();

}


export async function getMemberActivity(memberId){

    return await supabase
    .from("activity_logs")
    .select("*")
    .eq("member_id", memberId)
    .order("created_at", {
        ascending:false
    });

}
