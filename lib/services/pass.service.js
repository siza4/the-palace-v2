import { supabase } from "../supabase/client";


// Create Royal Pass
export async function createRoyalPass(data){

    return await supabase

    .from("royal_passes")

    .insert({

        member_id: data.memberId,

        qr_data: data.royalId,

        barcode_data: data.royalId,

        active: true

    })

    .select()

    .single();

}



// Get Royal Pass by Member ID
export async function getRoyalPass(memberId){

    return await supabase

    .from("royal_passes")

    .select("*")

    .eq("member_id", memberId)

    .eq("active", true)

    .single();

}
