import { supabase } from "../supabase/client";
import { memberHoldsOffice } from "../engine/offices";


export async function getMemberChambers(memberId){


    return await supabase

    .from("member_chambers")

    .select(`
    
        id,
        access_level,

        chambers(
            id,
            name,
            description,
            required_office

        )

    `)

    .eq("member_id", memberId);


}

/**
 * Checks whether a member is actually allowed into a Chamber right now.
 * Previously, membership in member_chambers was treated as permanent
 * access with no re-check against required_office (Charter 21.10:
 * Chambers must define Access requirements and Security rules, not just
 * a static membership list). If a Chamber has no required_office, any
 * member already listed in member_chambers may enter.
 */
export async function canAccessChamber(memberId, chamberId) {

    const { data: chamber, error: chamberError } = await supabase
        .from("chambers")
        .select("required_office")
        .eq("id", chamberId)
        .single();

    if (chamberError || !chamber) return false;

    const { data: membership, error: membershipError } = await supabase
        .from("member_chambers")
        .select("id")
        .eq("member_id", memberId)
        .eq("chamber_id", chamberId)
        .maybeSingle();

    if (membershipError || !membership) return false;

    if (!chamber.required_office) return true;

    return await memberHoldsOffice(memberId, chamber.required_office);

}
