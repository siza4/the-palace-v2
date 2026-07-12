import { supabase } from "../supabase/client";
import { createServerClient } from "../supabase/server";
import { supabaseService } from "../supabase/serviceClient";


// Create Member
// Service-role client — members has RLS enabled with a SELECT-only
// policy and no INSERT policy (confirmed via live pg_policies query).
// Note: lib/engine/admission.js's decideAdmissionRequest() currently
// inserts into members directly rather than calling this function — this
// fix is for every OTHER caller of createMember, and for consistency.
export async function createMember(memberData){

    return await supabaseService
        .from("members")
        .insert(memberData)
        .select()
        .single();

}



// Get Member By ID
// Used by Throne server page
export async function getMemberById(id){

    const serverSupabase = createServerClient();


    return await serverSupabase

        .from("members")

        .select("*")

        .eq("id", id)

        .single();

}



// Get Member By Royal ID
// Used by Palace entrance
export async function getMemberByRoyalId(royalId){

    return await supabase

        .from("members")

        .select("*")

        .eq("royal_id", royalId)

        .single();

}



// Update Member
// Same RLS gap as createMember above — members has no UPDATE policy either.
export async function updateMember(id, updates){

    return await supabaseService

        .from("members")

        .update(updates)

        .eq("id", id)

        .select()

        .single();

}
