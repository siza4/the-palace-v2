import { supabase } from "../supabase/client";


export async function getThroneData(memberId){


    const member =
    await supabase
    .from("members")
    .select("*")
    .eq("id", memberId)
    .single();



    const profile =
    await supabase
    .from("member_profiles")
    .select("*")
    .eq("member_id", memberId)
    .single();



    const pass =
    await supabase
    .from("royal_passes")
    .select("*")
    .eq("member_id", memberId)
    .single();



    const notifications =
    await supabase
    .from("notifications")
    .select("*")
    .eq("member_id", memberId)
    .order("created_at", {
        ascending:false
    })
    .limit(5);



    const activity =
    await supabase
    .from("activity_logs")
    .select("*")
    .eq("member_id", memberId)
    .order("created_at", {
        ascending:false
    })
    .limit(10);



    return {

        member: member.data,

        profile: profile.data,

        pass: pass.data,

        notifications: notifications.data,

        activity: activity.data

    };


}
