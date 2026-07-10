import { requestAdmission, listAdmissionRequests } from '@/lib/engine/admission';
import { verifySession } from '@/lib/auth/verifySession';
import { hasPermission } from '@/lib/auth/permissions';

/**
 * Royal Admission Office — public entry point.
 * Charter Vol II, Ch3: a visitor may submit an Admission Request. This
 * creates a row in admission_requests only — no member, identity, pass,
 * or Standing exists until a Butler with approve_membership approves it
 * (see /api/admission/[id] and lib/engine/admission.js decideAdmission()).
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { full_name, email, phone, country, notes } = body;

    if (!full_name || !email) {
      return Response.json(
        { success: false, message: 'Full name and email are required' },
        { status: 400 }
      );
    }

    const result = await requestAdmission({ full_name, email, phone, country, notes });

    if (!result.success) {
      return Response.json(
        { success: false, message: result.error?.message || 'Admission request failed' },
        { status: 400 }
      );
    }

    return Response.json(
      {
        success: true,
        request: {
          id: result.request.id,
          status: result.request.status
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error processing admission request:', error);
    return Response.json(
      { success: false, message: 'Failed to process admission request' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admission?status=submitted -> the Admissions review queue.
 * Requires approve_membership. Used by the Butler's Office UI.
 */
export async function GET(request) {
  try {
    const { member, error: authError } = await verifySession(request);

    if (authError || !member) {
      return Response.json({ error: authError || 'Not authenticated' }, { status: 401 });
    }

    const allowed = await hasPermission(member.id, 'approve_membership');
    if (!allowed) {
      return Response.json(
        { error: 'You do not hold the approve_membership permission' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const requests = await listAdmissionRequests(searchParams.get('status') || undefined);

    return Response.json({ requests }, { status: 200 });
  } catch (error) {
    console.error('Error fetching admission requests:', error);
    return Response.json({ error: 'Failed to fetch admission requests' }, { status: 500 });
  }
}
