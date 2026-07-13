import { createClient } from "@supabase/supabase-js";
import MemberCard from "../../../components/identity/MemberCard";
import QRPass from "../../../components/identity/QRPass";
import BarcodePass from "../../../components/identity/BarcodePass";

/**
 * Public, unauthenticated identity verification — a QR/barcode pass
 * being scanned doesn't require the scanner to have their own Palace
 * login, the same way a physical membership card doesn't. Reads from
 * the identity_verification view (migration 034), which exposes only
 * public-safe fields — never full_name or email, per the Charter's
 * legal-identity rule. Uses the anon key deliberately: this route is
 * meant to work for a visitor with no session at all, and the view
 * itself (not application code alone) is what limits which columns are
 * ever reachable this way.
 */
const supabasePublic = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function IdentityPage({ params }) {
  const { id } = await params;

  const { data: identity, error } = await supabasePublic
    .from("identity_verification")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.log("SUPABASE ERROR:", error);
  }

  if (!identity) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl">Identity not found</h1>
          <p className="mt-4 text-gray-400">{id}</p>
        </div>
      </main>
    );
  }

  const member = {
    id: identity.id,
    royal_id: identity.royal_id,
    royal_office: identity.royal_office,
    membership_status: identity.membership_status,
    membership_level: identity.membership_level
  };

  const standing = identity.standing_name
    ? { status: identity.standing_status, standing_levels: { name: identity.standing_name } }
    : null;

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div>
        <MemberCard member={member} standing={standing} />

        <div className="mt-8">
          <QRPass data={member.royal_id} />
        </div>

        <div className="mt-8">
          <BarcodePass value={member.royal_id} />
        </div>
      </div>
    </main>
  );
}
