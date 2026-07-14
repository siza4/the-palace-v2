import { createClient } from "@supabase/supabase-js";

const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Verifies the caller's identity server-side from their Supabase session JWT.
 * NEVER trust a client-supplied memberId/decidedBy field for anything sensitive —
 * this is the only source of truth for "who is actually making this request."
 *
 * @param {Request} request
 * @returns {Promise<{ member: object|null, error: string|null }>}
 */
export async function verifySession(request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return { member: null, error: "Missing session token" };
  }

  const { data: userData, error: userError } =
    await supabaseAuth.auth.getUser(token);

  if (userError || !userData?.user) {
    return { member: null, error: "Invalid or expired session" };
  }

  // TEMPORARY DEBUG LOGGING — remove once diagnosed.
  console.log("[DEBUG verifySession] Authenticated Supabase Auth email:", userData.user.email);

  const { data: member, error: memberError } = await supabaseAdmin
    .from("members")
    .select("*")
    .eq("email", userData.user.email)
    .single();

  console.log("[DEBUG verifySession] members lookup error:", memberError);
  console.log("[DEBUG verifySession] Resolved member:", member ? { id: member.id, email: member.email, status: member.status } : null);

  if (memberError || !member) {
    return { member: null, error: "No Palace member linked to this session" };
  }

  return { member, error: null };
}
