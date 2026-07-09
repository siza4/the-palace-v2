import { submitReview } from '@/lib/engine/governance';
import { verifySession } from '@/lib/auth/verifySession';
import { hasPermission } from '@/lib/auth/permissions';

export async function POST(request, { params }) {
  try {
    const { member, error: authError } = await verifySession(request);
    if (authError || !member) {
      return Response.json({ error: authError || 'Not authenticated' }, { status: 401 });
    }

    const allowed = await hasPermission(member.id, 'review_governance_proposal');
    if (!allowed) {
      return Response.json(
        { error: 'You do not hold the review_governance_proposal permission' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { recommendation, comments } = body;

    if (!['support', 'oppose', 'abstain'].includes(recommendation)) {
      return Response.json(
        { error: "recommendation must be 'support', 'oppose', or 'abstain'" },
        { status: 400 }
      );
    }

    const review = await submitReview(params.id, member.id, recommendation, comments);
    return Response.json({ review }, { status: 201 });
  } catch (error) {
    console.error('Error submitting review:', error);
    return Response.json(
      { error: error.message || 'Failed to submit review' },
      { status: 500 }
    );
  }
}
