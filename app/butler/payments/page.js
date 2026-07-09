"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase/client";

export default function PaymentsPage() {
  const [session, setSession] = useState(undefined);
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push("/login");
        return;
      }
      setSession(data.session);
    });
  }, [router]);

  useEffect(() => {
    if (!session) return;
    (async () => {
      const res = await fetch("/api/treasury/contributions", {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      const body = await res.json();
      if (res.ok) setContributions(body.contributions || []);
      setLoading(false);
    })();
  }, [session]);

  if (session === undefined || loading) {
    return <div className="p-6 text-[#D4AF37]">Verifying access...</div>;
  }

  return (
    <main className="min-h-screen bg-[#070707] p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl text-[#D4AF37] font-bold mb-6">
          Treasury Contributions
        </h1>

        {contributions.length === 0 && (
          <p className="text-gray-400">No contributions recorded yet.</p>
        )}

        <div className="space-y-3">
          {contributions.map((c) => (
            <div
              key={c.id}
              className="bg-[#5B0A18] border border-[#D4AF37]/40 rounded-lg p-4 flex justify-between items-center"
            >
              <div>
                <p className="text-white">{c.members?.royal_id || c.member_id}</p>
                <p className="text-gray-400 text-sm">
                  {c.days} day(s) · ${Number(c.amount).toFixed(2)}
                </p>
              </div>
              <span
                className={`text-xs uppercase px-2 py-1 rounded ${
                  c.status === "confirmed"
                    ? "text-green-400"
                    : c.status === "failed"
                    ? "text-red-400"
                    : "text-gray-400"
                }`}
              >
                {c.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
