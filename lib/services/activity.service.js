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
