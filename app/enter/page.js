"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Retired. This page used to accept a free-text Royal ID or Pass value
 * and treat it as a login — no password, no email verification, no
 * session — then redirect straight into a private member page. That is
 * not authentication; it's a lookup anyone could perform on anyone
 * else's identifier. The Palace's one real authentication flow is
 * Supabase Auth via /login (magic link). This redirect exists only so
 * old links/bookmarks don't dead-end.
 */
export default function LegacyEnterRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/login");
  }, [router]);
  return null;
}
