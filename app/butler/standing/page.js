"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase/client";

export default function StandingReviewQueuePage() {
  const [session, setSession] = useState(undefined);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(null);
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
    if (session) fetchRequests();
  }, [session]);

  async function authHeaders() {
    const { data } = await supabase.auth.getSession();
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.session?.access_token}`
    };
  }

  async function fetchRequests() {
    try {
      const res = await fetch("/api/standing/advance?all=true&status=pending", {
        headers: await authHeaders()
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setRequests(body.requests || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function decide(id, approve) {
    setProcessing(id);
    try {
      const res = await fetch(`/api/standing/advance/${id}`, {
        method: approve ? "POST" : "PUT",
        headers: await authHeaders(),
        body: JSON.stringify({
          decisionNotes: approve ? "Approved by Authority Office" : "Rejected by Authority Office"
        })
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setRequests(requests.filter((r) => r.id !== id));
    } catch (err) {
      alert(err.message);
    } finally {
      setProcessing(null);
    }
  }

  if (session === undefined || loading) {
    return <div className="p-6 text-[#D4AF37]">Verifying access...</div>;
  }

  return (
    <main className="min-h-screen bg-[#070707] p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl text-[#D4AF37] font-bold mb-2">
          Standing Advancement Requests
        </h1>
        <p className="text-gray-400 text-sm mb-6">
          Circle, Council, and Authority Standing are never purchased —
          they are earned through contribution, time, trust, and
          responsibility (Charter 12.10). This queue is the only path to
          advancement.
        </p>

        {error && <p className="text-red-400 mb-4">{error}</p>}

        {requests.length === 0 && (
          <p className="text-gray-400">No pending requests.</p>
        )}

        {requests.map((r) => (
          <div
            key={r.id}
            className="bg-[#5B0A18] border border-[#D4AF37]/40 rounded-lg p-6 mb-4"
          >
            <p className="text-white font-semibold">
              {r.members?.royal_id || r.member_id}
            </p>
            <p className="text-gray-400 text-sm mb-2">
              Requesting: {r.standing_levels?.name}
            </p>
            {r.reason && (
              <p className="text-gray-300 text-sm mb-4 italic">
                "{r.reason}"
              </p>
            )}

            <div className="flex gap-3">
              <button
                disabled={processing === r.id}
                onClick={() => decide(r.id, true)}
                className="bg-[#D4AF37] text-black px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
              >
                Approve
              </button>
              <button
                disabled={processing === r.id}
                onClick={() => decide(r.id, false)}
                className="bg-transparent border border-red-400 text-red-400 px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
