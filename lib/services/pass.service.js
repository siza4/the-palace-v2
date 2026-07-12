import { supabase } from "../supabase/client";
import { createServerClient } from "../supabase/server";
import { supabaseService } from "../supabase/serviceClient";



// Create Royal Pass
// Service-role client — royal_passes has RLS enabled with a SELECT-only
// policy and no INSERT policy (confirmed via live pg_policies query).
export async function createRoyalPass(data){

    return await supabaseService

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
