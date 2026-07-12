import { createClient } from '@supabase/supabase-js';

/**
 * Service-role client. Bypasses RLS entirely — only import into
 * server-only code (API routes, 'use server' engine files) that has
 * already verified the caller's identity and permissions at the route
 * layer.
 *
 * members, royal_passes, and member_profiles have RLS enabled with a
 * SELECT-only policy and no INSERT/UPDATE policy at all — confirmed via
 * a live pg_policies query. lib/engine/admission.js, standing.js,
 * treasury.js, and governance.js already each construct their own
 * inline service-role client for exactly this reason; this file exists
 * so member.service.js/pass.service.js/profile.service.js (which were
 * still using the anon client, unlike the rest of lib/engine/) stop
 * duplicating that pattern ad hoc.
 */
export const supabaseService = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
