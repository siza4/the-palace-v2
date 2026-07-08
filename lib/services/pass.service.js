import { supabase } from "../supabase/client";
import { createServerClient } from "../supabase/server";



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



// Get Royal Pass
export async function getRoyalPass(memberId){

    const serverSupabase = createServerClient();


    return await serverSupabase

        .from("royal_passes")

        .select("*")

        .eq("member_id", memberId)

        .maybeSingle();

}
