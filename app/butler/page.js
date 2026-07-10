"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase/client";

export default function ButlerDashboard() {
  const [stats, setStats] = useState({
    pendingApprovals: 0,
    admissionRequests: 0,
    activeMembers: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(undefined);
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
    if (session) fetchStats();
  }, [session]);

  async function fetchStats() {
    try {
      const { data } = await supabase.auth.getSession();
      const appRes = await fetch("/api/standing/advance?all=true&status=pending", {
        headers: { Authorization: `Bearer ${data.session?.access_token}` }
      });

      if (appRes.status === 403 || appRes.status === 401) {
        // Authenticated but not an Office holder with this permission.
        // Don't error the whole dashboard — just show zero and let them
        // know via the card itself.
        setStats((prev) => ({ ...prev, pendingApprovals: null }));
        setLoading(false);
        return;
      }

      const appData = await appRes.json();
      setStats((prev) => ({
        ...prev,
        pendingApprovals: appData.requests?.length || 0
      }));

      const admissionRes = await fetch("/api/admission?status=submitted", {
        headers: { Authorization: `Bearer ${data.session?.access_token}` }
      });
      if (admissionRes.ok) {
        const admissionData = await admissionRes.json();
        setStats((prev) => ({
          ...prev,
          admissionRequests: admissionData.requests?.length || 0
        }));
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setLoading(false);
    }
  }

  if (session === undefined) {
    return <div className="p-6 text-[#D4AF37]">Verifying access...</div>;
  }

  return (
    <main className="min-h-screen bg-[#070707] p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl text-[#D4AF37] font-bold mb-8">
          The Butler's Office
        </h1>

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-[#5B0A18] border border-[#D4AF37] rounded-lg p-6">
            <h2 className="text-[#C0C0C0] text-sm mb-2">ADMISSION REQUESTS</h2>
            <div className="text-4xl text-[#D4AF37] font-bold">
              {loading ? "..." : stats.admissionRequests}
            </div>
            <a
              href="/butler/admissions"
              className="text-[#D4AF37] text-sm hover:underline mt-4 inline-block"
            >
              Review Queue →
            </a>
          </div>

          <div className="bg-[#5B0A18] border border-[#D4AF37] rounded-lg p-6">
            <h2 className="text-[#C0C0C0] text-sm mb-2">STANDING REQUESTS</h2>
            <div className="text-4xl text-[#D4AF37] font-bold">
              {loading
                ? "..."
                : stats.pendingApprovals === null
                ? "—"
                : stats.pendingApprovals}
            </div>
            <a
              href="/butler/standing"
              className="text-[#D4AF37] text-sm hover:underline mt-4 inline-block"
            >
              Review Queue →
            </a>
          </div>

          <div className="bg-[#5B0A18] border border-[#D4AF37] rounded-lg p-6">
            <h2 className="text-[#C0C0C0] text-sm mb-2">ACTIVE MEMBERS</h2>
            <div className="text-4xl text-[#D4AF37] font-bold">
              {loading ? "..." : stats.activeMembers}
            </div>
            <a
              href="/butler/members"
              className="text-[#D4AF37] text-sm hover:underline mt-4 inline-block"
            >
              View Members →
            </a>
          </div>

          <div className="bg-[#5B0A18] border border-[#D4AF37] rounded-lg p-6">
            <h2 className="text-[#C0C0C0] text-sm mb-2">TOTAL REVENUE</h2>
            <div className="text-4xl text-[#D4AF37] font-bold">
              ${loading ? "..." : stats.totalRevenue.toFixed(2)}
            </div>
            <a
              href="/butler/payments"
              className="text-[#D4AF37] text-sm hover:underline mt-4 inline-block"
            >
              View Payments →
            </a>
          </div>
        </div>

        <div className="bg-[#5B0A18] border border-[#D4AF37] rounded-lg p-6">
          <h2 className="text-2xl text-[#D4AF37] font-bold mb-6">
            Administration
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <a
              href="/butler/admissions"
              className="bg-[#3a0809] hover:bg-[#4a0a0a] border border-[#D4AF37] text-[#D4AF37] font-bold py-3 px-4 rounded text-center transition"
            >
              Admissions
            </a>
            <a
              href="/butler/members"
              className="bg-[#3a0809] hover:bg-[#4a0a0a] border border-[#D4AF37] text-[#D4AF37] font-bold py-3 px-4 rounded text-center transition"
            >
              Member Management
            </a>
            <a
              href="/butler/standing"
              className="bg-[#3a0809] hover:bg-[#4a0a0a] border border-[#D4AF37] text-[#D4AF37] font-bold py-3 px-4 rounded text-center transition"
            >
              Standing Requests
            </a>
            <a
              href="/butler/permissions"
              className="bg-[#3a0809] hover:bg-[#4a0a0a] border border-[#D4AF37] text-[#D4AF37] font-bold py-3 px-4 rounded text-center transition"
            >
              Manage Permissions
            </a>
            <a
              href="/butler/governance"
              className="bg-[#3a0809] hover:bg-[#4a0a0a] border border-[#D4AF37] text-[#D4AF37] font-bold py-3 px-4 rounded text-center transition"
            >
              Governance
            </a>
            <a
              href="/butler/payments"
              className="bg-[#3a0809] hover:bg-[#4a0a0a] border border-[#D4AF37] text-[#D4AF37] font-bold py-3 px-4 rounded text-center transition"
            >
              Payment History
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
