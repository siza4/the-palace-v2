import { supabase } from "../supabase/client";


export async function getMemberChambers(memberId){


    return await supabase

    .from("member_chambers")

    .select(`
    
        id,
        access_level,

        chambers(
            id,
            name,
            description

        )

    `)

    .eq("member_id", memberId);


}
