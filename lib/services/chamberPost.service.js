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
