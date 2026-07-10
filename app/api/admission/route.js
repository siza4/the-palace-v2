import { requestAdmission } from '@/lib/engine/admission';

/**
 * Royal Admission Office — public entry point.
 * Charter Vol II, Ch3: any visitor may request admission; the engine
 * creates the Member as Standing "Pending" with membership_level "Citizen".
 * This route performs no privilege elevation — see lib/engine/admission.js
 * for the Standing grant, which never exceeds the Charter-defined baseline.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { full_name, email, phone, country } = body;

    if (!full_name || !email) {
      return Response.json(
        { success: false, message: 'Full name and email are required' },
        { status: 400 }
      );
    }

    const result = await requestAdmission({ full_name, email, phone, country });

    if (!result.success) {
      return Response.json(
        { success: false, message: result.error?.message || 'Admission request failed' },
        { status: 400 }
      );
    }

    return Response.json(
      {
        success: true,
        member: {
          id: result.member.id,
          royal_id: result.member.royal_id,
          status: result.member.status,
        },
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
