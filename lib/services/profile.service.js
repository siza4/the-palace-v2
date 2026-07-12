import { supabase } from "../supabase/client";
import { supabaseService } from "../supabase/serviceClient";


// Service-role client — member_profiles has RLS enabled with a SELECT-only
// policy and no INSERT/UPDATE policy (confirmed via live pg_policies query).
export async function createProfile(data){

    return await supabaseService

    .from("member_profiles")

    .insert(data)

    .select()

    .single();

}



export async function getProfile(memberId){

    return await supabase

    .from("member_profiles")

    .select("*")

    .eq("member_id", memberId)

    .single();

}



export async function updateProfile(id, updates){

    return await supabaseService

    .from("member_profiles")

    .update(updates)

    .eq("id", id)

    .select()

    .single();

}
