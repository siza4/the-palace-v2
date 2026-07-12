import { verifySession } from '@/lib/auth/verifySession';
import { enterPalace } from '@/lib/engine/entry';
import { loadRoyalAnnouncements } from '@/lib/engine/announcement';
import { loadMemberChambers } from '@/lib/engine/chamber';

/**
 * Returns the authenticated member's own Throne Room data. There is no
 * :id in this route on purpose — "whose throne" is determined entirely
 * by the verified Supabase Auth session, never by a client-supplied
 * identifier. This is the fix for the /enter + /throne/[id] gap: those
 * let anyone view any member's private data by typing/guessing an
 * identifier, with no session at all.
 *
 * enterPalace() is reused here, but now as a post-authentication
 * authorization check (is this already-verified member's Pass/Standing/
 * contribution status valid?) — not as the authentication step itself.
 */
export async function GET(request) {
  try {
    const { member, error: authError } = await verifySession(request);
    if (authError || !member) {
      return Response.json({ error: authError || 'Not authenticated' }, { status: 401 });
    }

    const entryResult = await enterPalace(member.id);
    if (!entryResult.success) {
      return Response.json(
        { error: entryResult.message, membershipStatus: entryResult.membershipStatus },
        { status: 403 }
      );
    }

    const announcements = await loadRoyalAnnouncements();
    const chambers = await loadMemberChambers(member.id);

    return Response.json({
      member: entryResult.member,
      membershipStatus: entryResult.membershipStatus,
      announcements,
      chambers,
    });
  } catch (error) {
    console.error('Error loading throne data:', error);
    return Response.json({ error: 'Failed to load Throne Room' }, { status: 500 });
  }
}
