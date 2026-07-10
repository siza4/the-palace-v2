import { createAdmissionRequest } from '@/lib/engine/admission';

/**
 * Applicant submits an admission request. Creates ONLY an
 * admission_requests row — no member, no pass, no Standing. Those are
 * created by decideAdmissionRequest() once Authority approves (see
 * app/api/butler/admission-requests/[id]/decide/route.js).
 */
export async function POST(request) {
  try {
    const form = await request.json();
    const result = await createAdmissionRequest(form);

    if (!result.success) {
      return Response.json({ success: false, error: result.error }, { status: 400 });
    }

    return Response.json({ success: true, request: result.request }, { status: 201 });
  } catch (err) {
    console.error('Admission submission error:', err);
    return Response.json(
      { success: false, error: 'Connection error. Please try again.' },
      { status: 500 }
    );
  }
}
