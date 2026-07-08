import { supabase } from "../supabase/client";


export async function getAnnouncements(){

    return await supabase

    .from("announcements")

    .select("*")

    .order("created_at", {
        ascending: false
    });

}
