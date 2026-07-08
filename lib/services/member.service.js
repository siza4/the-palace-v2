import { supabase } from "../supabase/client";


// Create a new Palace member
export async function createMember(memberData) {

    return await supabase

    .from("members")

    .insert(memberData)

    .select()

    .single();

}



// Get member by database ID
export async function getMemberById(id) {

    return await supabase

    .from("members")

    .select("*")

    .eq("id", id)

    .single();

}



// Get member by Royal ID
export async function getMemberByRoyalId(royalId) {

    return await supabase

    .from("members")

    .select("*")

    .eq("royal_id", royalId)

    .single();

}



// Get member by email
export async function getMemberByEmail(email) {

    return await supabase

    .from("members")

    .select("*")

    .eq("email", email)

    .single();

}



// Update member information
export async function updateMember(id, updates) {

    return await supabase

    .from("members")

    .update(updates)

    .eq("id", id)

    .select()

    .single();

}



// Update membership level
export async function updateMembership(id, level) {

    return await supabase

    .from("members")

    .update({

        membership_level: level

    })

    .eq("id", id)

    .select()

    .single();

}



// Update member status
export async function updateMemberStatus(id, status) {

    return await supabase

    .from("members")

    .update({

        status

    })

    .eq("id", id)

    .select()

    .single();

}
