import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Checks whether a member holds a given permission, via their assigned
 * royal_roles -> role_permissions mapping.
 *
 * @param {string} memberId
 * @param {string} permissionName e.g. "approve_membership"
 * @returns {Promise<boolean>}
 */
export async function hasPermission(memberId, permissionName) {
  if (!memberId || !permissionName) return false;

  const { data, error } = await supabaseAdmin
    .from("member_roles")
    .select(
      `
      royal_roles (
        role_permissions (
          permissions ( name )
        )
      )
    `
    )
    .eq("member_id", memberId);

  if (error || !data) return false;

  for (const memberRole of data) {
    const rolePerms = memberRole.royal_roles?.role_permissions || [];
    for (const rp of rolePerms) {
      if (rp.permissions?.name === permissionName) return true;
    }
  }

  return false;
}

/**
 * Checks whether a member holds a given Permission AND currently holds
 * at least one of the given Offices, actively assigned.
 *
 * Role and Office are deliberately separate systems (Charter: "do not
 * collapse Role, Office, Standing, Permission"). Permission comes from
 * Role -> role_permissions. Office is a distinct, independently-held
 * assignment (member_offices). Holding the permission alone is not
 * sufficient for actions the Charter designates as requiring a specific
 * institutional function — e.g. reviewing an admission request requires
 * both the review_admission_request permission AND actually holding the
 * Admissions Office or Butler's Office; permission alone would let any
 * Royal Council member review regardless of whether they hold that
 * function.
 *
 * @param {string} memberId
 * @param {string} permissionName e.g. "decide_admission_request"
 * @param {string[]} officeNames e.g. ["Authority Office"] — member must
 *   hold at least one (OR, not AND, across this list)
 * @returns {Promise<boolean>}
 */
export async function hasPermissionAndOffice(memberId, permissionName, officeNames) {
  if (!memberId || !permissionName || !Array.isArray(officeNames) || officeNames.length === 0) {
    return false;
  }

  const permitted = await hasPermission(memberId, permissionName);
  if (!permitted) return false;

  const { data, error } = await supabaseAdmin
    .from("member_offices")
    .select("offices!inner(name)")
    .eq("member_id", memberId)
    .eq("active", true)
    .in("offices.name", officeNames);

  if (error || !data) return false;
  return data.length > 0;
}
