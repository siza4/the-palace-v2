import { createClient } from '@supabase/supabase-js';

/**
 * Service-role client. Bypasses RLS entirely — only ever import this into
 * server-only code (API routes, 'use server' engine files) that has already
 * verified the caller's identity and permissions at the route layer.
 *
 * Introduced during the RLS forensic audit: members, royal_passes,
 * member_profiles, and notifications have RLS enabled with SELECT-only
 * policies and no INSERT/UPDATE policy at all, so any write using the anon
 * client (NEXT_PUBLIC_SUPABASE_ANON_KEY) fails with a 42501 RLS violation.
 * lib/engine/standing.js, treasury.js, membership.js, and admission.js each
 * already construct their own inline service-role client for exactly this
 * reason — this file exists so that pattern doesn't keep getting duplicated
 * as more services need the same fix.
 */
export const supabaseService = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
