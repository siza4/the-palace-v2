import { supabase } from "../supabase/client";
import { createServerClient } from "../supabase/server";
import { supabaseService } from "../supabase/serviceClient";


// Create Member
// Uses the service-role client: members has RLS enabled with a SELECT-only
// policy and no INSERT policy, so the anon client this used to use would
// fail every call with a 42501 RLS violation (confirmed via live pg_policies
// query during the forensic audit).
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
