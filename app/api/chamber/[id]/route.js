import { createClient } from '@supabase/supabase-js';
import { verifySession } from '@/lib/auth/verifySession';
import { canAccessChamber } from '@/lib/services/chamber.service';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Returns a Chamber's content only if the requesting member is (a) a real,
 * verified session, (b) listed in member_chambers, and (c) currently
 * holds the Chamber's required_office if one is set.
 *
 * Replaces app/chamber/[id]/page.js's previous check, which used a
 * hardcoded member id for every visitor and never checked required_office.
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { member, error: authError } = await verifySession(request);

    if (authError || !member) {
      return Response.json({ error: authError || 'Not authenticated' }, { status: 401 });
    }

    const chamberId = id;

    const { data: chamber, error: chamberError } = await supabase
      .from('chambers')
      .select('*')
      .eq('id', chamberId)
      .single();

    if (chamberError || !chamber) {
      return Response.json({ error: 'Chamber not found' }, { status: 404 });
    }

    const allowed = await canAccessChamber(member.id, chamberId);
    if (!allowed) {
      return Response.json(
        { error: 'You do not have permission to enter this Chamber.' },
        { status: 403 }
      );
    }

    const { data: access } = await supabase
      .from('member_offices')
      .select('offices(name)')
      .eq('member_id', member.id)
      .eq('active', true);

    const accessLevel = chamber.required_office
      ? (access || []).some((o) => o.offices?.name === chamber.required_office)
        ? chamber.required_office
        : null
      : 'Member';

    const { data: posts } = await supabase
      .from('chamber_posts')
      .select('*')
      .eq('chamber_id', chamberId)
      .order('created_at', { ascending: false });

    return Response.json(
      { chamber, accessLevel, posts: posts || [] },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error loading chamber:', error);
    return Response.json({ error: 'Failed to load chamber' }, { status: 500 });
  }
}
