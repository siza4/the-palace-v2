import { supabase } from "../supabase/client";
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
// Used by Throne server page (via enterPalace(), after verifySession()
// has already authenticated the caller). createServerClient() attaches
// no session/JWT at all — if the members SELECT policy requires an
// authenticated JWT matching the row's email (the pattern used
// elsewhere in this schema), an anon-role call with no JWT satisfies no
// policy and returns zero rows, which .single() turns into an error —
// this was surfacing live as "Royal Identity not found" on login.
// Service-role is safe here: the caller's identity was already verified
// before this function is ever reached.
export async function getMemberById(id){

    return await supabaseService

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
