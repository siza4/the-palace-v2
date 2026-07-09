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
