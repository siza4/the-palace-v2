import { createServerClient } from "../../../lib/supabase/server";
import MemberCard from "../../../components/identity/MemberCard";
import QRPass from "../../../components/identity/QRPass";
import BarcodePass from "../../../components/identity/BarcodePass";

// Public-safe fields only. full_name and email are legal identity and must
// never be served on a public route — see Charter Appendix,
// "Identity Within The Palace."
const PUBLIC_FIELDS = "id, royal_id, royal_office, membership_status, membership_level";

export default async function IdentityPage({ params }) {
  const { id } = await params;

  const supabase = createServerClient();

  const { data: member, error } = await supabase
    .from("members")
    .select(PUBLIC_FIELDS)
    .eq("id", id)
    .single();

  if (error) {
    console.log("SUPABASE ERROR:", error);
  }

  if (!member) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl">Identity not found</h1>
          <p className="mt-4 text-gray-400">{id}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div>
        <MemberCard member={member} />

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
