"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Retired. This page used to load a member's private data straight off
 * the URL id, with no session check at all — anyone who knew or guessed
 * a member's UUID could view their Throne Room. Replaced by /throne,
 * which derives "whose throne" from the authenticated Supabase Auth
 * session server-side (see app/api/throne/route.js), never from the URL.
 * This redirect exists only so old links/bookmarks don't dead-end.
 */
export default function LegacyThroneRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/throne");
  }, [router]);
  return null;
}
