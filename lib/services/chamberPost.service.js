/**
 * @deprecated Confirmed unreachable — nothing anywhere in the app
 * imports getChamberPosts. The live chamber-posts read path is inline
 * in app/api/chamber/[id]/route.js. Kept per audit decision (2026-07)
 * until the first stable Palace release; scheduled for removal after
 * that in a dedicated cleanup commit, not before.
 */
import { supabase } from "../supabase/client";


export async function getChamberPosts(chamberId){


    return await supabase

    .from("chamber_posts")

    .select("*")

    .eq("chamber_id", chamberId)

    .order("created_at", {
        ascending:false
    });


}
