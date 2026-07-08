import { supabase } from "../supabase/client";
import { createServerClient } from "../supabase/server";


// Create Member
export async function createMember(memberData){

    return await supabase
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
export async function updateMember(id, updates){

    return await supabase

        .from("members")

        .update(updates)

        .eq("id", id)

        .select()

        .single();

}
