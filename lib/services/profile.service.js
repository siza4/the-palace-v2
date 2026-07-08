import { supabase } from "../supabase/client";


export async function createProfile(data){

    return await supabase

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

    return await supabase

    .from("member_profiles")

    .update(updates)

    .eq("id", id)

    .select()

    .single();

}
