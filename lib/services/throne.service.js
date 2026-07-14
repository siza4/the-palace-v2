/**
 * @deprecated Confirmed unreachable — nothing anywhere in the app
 * imports getThroneData or lib/engine/throne.js's loadThrone(), which
 * is this function's only caller. The live Throne data path is
 * app/api/throne/route.js -> lib/engine/entry.js's enterPalace() +
 * lib/engine/announcement.js + lib/engine/chamber.js. This file also
 * predates the RLS/session fixes applied to the live path (it still
 * uses the plain anon client) and was never updated, since nothing
 * calls it. Kept per audit decision (2026-07) until the first stable
 * Palace release; scheduled for removal in a dedicated cleanup commit
 * after that, not before. See docs/ADMISSION_WORKFLOW.md and the
 * forensic audit history for the full dependency trace.
 */
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
