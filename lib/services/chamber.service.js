import { supabaseService } from "../supabase/serviceClient";
import { memberHoldsOffice } from "../engine/offices";

/**
 * Chamber Architecture (Charter Ch7: "Access is determined by:
 * Standing + Office + Permission"; Ch5 ties Chamber access directly to
 * Standing tier — "Member Standing -> Member Chambers", "Council
 * Standing -> Council Chamber access"). Chamber access is computed from
 * the institutional authority model, not from a separately maintained
 * membership list — member_chambers has no writer anywhere in this
 * codebase, so a "listed member" gate denied everyone unconditionally,
 * for every Chamber, including the founder. The table itself is kept
 * (not dropped) for future optional overrides/invitations, but it is no
 * longer part of the authorization path. See docs/CHAMBER_ARCHITECTURE.md.
 *
 * Uses the service-role client: this was previously the plain anon
 * client with no session attached when called server-side (same bug
 * class fixed elsewhere in member.service.js / pass.service.js).
 */

/**
 * Checks whether a member is actually allowed into a Chamber right now.
 * - If the Chamber has a required_office, the member must hold that
 *   Office (memberHoldsOffice — exact match against offices.name).
 * - If the Chamber has no required_office, baseline access requires
 *   holding any currently active Standing (Charter Ch5: Member Standing
 *   is what grants Member Chambers in the first place — a Chamber isn't
 *   open to visitors with no Standing at all).
 */
export async function canAccessChamber(memberId, chamberId) {
    const { data: chamber, error: chamberError } = await supabaseService
        .from("chambers")
        .select("required_office")
        .eq("id", chamberId)
        .single();

    if (chamberError || !chamber) return false;

    if (chamber.required_office) {
        return await memberHoldsOffice(memberId, chamber.required_office);
    }

    const { data: standing } = await supabaseService
        .from("member_standing")
        .select("status")
        .eq("member_id", memberId)
        .maybeSingle();

    return standing?.status === "active";
}

/**
 * Computes every Chamber a member currently qualifies for, from Office +
 * Standing — not a stored list. Returns the same shape the old
 * member_chambers join produced ({ id, access_level, chambers: {...} }),
 * so app/throne/page.js and other existing consumers don't need to
 * change: access_level is now a derived label (the required Office's
 * name, or 'Member' for baseline Standing-gated access) rather than a
 * manually-set value nothing ever actually set.
 */
export async function getMemberChambers(memberId) {
    const { data: chambers, error: chambersError } = await supabaseService
        .from("chambers")
        .select("id, name, description, required_office");

    if (chambersError) return { data: null, error: chambersError };

    const { data: offices } = await supabaseService
        .from("member_offices")
        .select("offices(name)")
        .eq("member_id", memberId)
        .eq("active", true);

    const officeNames = new Set((offices || []).map((o) => o.offices?.name).filter(Boolean));

    const { data: standing } = await supabaseService
        .from("member_standing")
        .select("status")
        .eq("member_id", memberId)
        .maybeSingle();

    const hasActiveStanding = standing?.status === "active";

    const accessible = (chambers || [])
        .filter((c) => (c.required_office ? officeNames.has(c.required_office) : hasActiveStanding))
        .map((c) => ({
            id: c.id,
            access_level: c.required_office || "Member",
            chambers: {
                id: c.id,
                name: c.name,
                description: c.description,
                required_office: c.required_office
            }
        }));

    return { data: accessible, error: null };
}
