"use client";

import { useState, useEffect } from "react";

export default function ButlerDashboard() {
  const [stats, setStats] = useState({
    pendingApprovals: 0,
    activeMembers: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      // Fetch pending approvals
      const appRes = await fetch("/api/approval/requests?status=pending");
      const appData = await appRes.json();

      setStats(prev => ({
        ...prev,
        pendingApprovals: appData.requests?.length || 0
      }));
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#070707] p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl text-[#D4AF37] font-bold mb-8">The Butler's Office</h1>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Pending Approvals Card */}
          <div className="bg-[#5B0A18] border border-[#D4AF37] rounded-lg p-6">
            <h2 className="text-[#C0C0C0] text-sm mb-2">PENDING APPROVALS</h2>
            <div className="text-4xl text-[#D4AF37] font-bold">
              {loading ? "..." : stats.pendingApprovals}
            </div>
            <a
              href="/butler/approvals"
              className="text-[#D4AF37] text-sm hover:underline mt-4 inline-block"
            >
              Review Queue →
            </a>
          </div>

          {/* Active Members Card */}
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

          {/* Revenue Card */}
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

        {/* Admin Menu */}
        <div className="bg-[#5B0A18] border border-[#D4AF37] rounded-lg p-6">
          <h2 className="text-2xl text-[#D4AF37] font-bold mb-6">Administration</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <a
              href="/butler/members"
              className="bg-[#3a0809] hover:bg-[#4a0a0a] border border-[#D4AF37] text-[#D4AF37] font-bold py-3 px-4 rounded text-center transition"
            >
              Member Management
            </a>
            <a
              href="/butler/approvals"
              className="bg-[#3a0809] hover:bg-[#4a0a0a] border border-[#D4AF37] text-[#D4AF37] font-bold py-3 px-4 rounded text-center transition"
            >
              Approval Queue
            </a>
            <a
              href="/butler/permissions"
              className="bg-[#3a0809] hover:bg-[#4a0a0a] border border-[#D4AF37] text-[#D4AF37] font-bold py-3 px-4 rounded text-center transition"
            >
              Manage Permissions
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
