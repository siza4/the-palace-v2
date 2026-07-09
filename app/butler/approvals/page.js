"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase/client";

export default function ApprovalQueuePage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(null);
  const [session, setSession] = useState(undefined); // undefined = checking, null = none
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
      const res = await fetch("/api/approval/requests?status=pending");
      if (!res.ok) throw new Error("Failed to fetch requests");
      const data = await res.json();
      setRequests(data.requests || []);
    } catch (err) {
      setError("Failed to load approval requests");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(requestId) {
    setProcessing(requestId);
    try {
      const res = await fetch(`/api/approval/requests/${requestId}`, {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ decisionNotes: "Approved by Office holder" })
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to approve");

      setRequests(requests.filter((r) => r.id !== requestId));
    } catch (err) {
      alert("Error approving request: " + err.message);
    } finally {
      setProcessing(null);
    }
  }

  async function handleReject(requestId) {
    setProcessing(requestId);
    try {
      const res = await fetch(`/api/approval/requests/${requestId}`, {
        method: "PUT",
        headers: await authHeaders(),
        body: JSON.stringify({ decisionNotes: "Rejected by Office holder" })
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to reject");

      setRequests(requests.filter((r) => r.id !== requestId));
    } catch (err) {
      alert("Error rejecting request: " + err.message);
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
        <h1 className="text-3xl text-[#D4AF37] font-bold mb-6">
          Membership Approvals
        </h1>

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
              {r.member?.name || r.member_id}
            </p>
            <p className="text-gray-400 text-sm mb-2">
              Requesting: {r.plan?.name}
            </p>
            {r.reason && (
              <p className="text-gray-300 text-sm mb-4 italic">
                "{r.reason}"
              </p>
            )}

            <div className="flex gap-3">
              <button
                disabled={processing === r.id}
                onClick={() => handleApprove(r.id)}
                className="bg-[#D4AF37] text-black px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
              >
                Approve
              </button>
              <button
                disabled={processing === r.id}
                onClick={() => handleReject(r.id)}
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
