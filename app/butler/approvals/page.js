"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ApprovalQueuePage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetchRequests();
  }, []);

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

  async function handleApprove(requestId, memberId) {
    setProcessing(requestId);
    try {
      const res = await fetch(`/api/approval/requests/${requestId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decidedBy: localStorage.getItem("memberId"),
          decisionNotes: "Approved by admin"
        })
      });

      if (!res.ok) throw new Error("Failed to approve");
      
      setRequests(requests.filter(r => r.id !== requestId));
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decidedBy: localStorage.getItem("memberId"),
          decisionNotes: "Rejected by admin"
        })
      });

      if (!res.ok) throw new Error("Failed to reject");
      
      setRequests(requests.filter(r => r.id !== requestId));
    } catch (err) {
      alert("Error rejecting request: " + err.message);
    } finally {
      setProcessing(null);
    }
  }

  if (loading) return <div className="p-6 text-[#D4AF37]">Loading...</div>;

  return (
    <main className="min-h-screen bg-[#070707] p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl text-[#D4AF37] font-bold mb-6">Membership Approvals</h1>

        {error && <div className="text-red-500 mb-4 p-3 bg-red-900 rounded">{error}</div>}

        {requests.length === 0 ? (
          <div className="bg-[#5B0A18] border border-[#D4AF37] p-6 rounded text-center text-[#C0C0C0]">
            No pending approval requests
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <div
                key={req.id}
                className="bg-[#5B0A18] border border-[#D4AF37] rounded p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl text-[#D4AF37] font-bold">
                      {req.member?.name || 'Unknown Member'}
                    </h2>
                    <p className="text-[#C0C0C0]">{req.member?.email}</p>
                    <p className="text-[#888888] text-sm mt-2">
                      Requested: {new Date(req.requested_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg text-[#D4AF37] font-bold">
                      {req.plan?.name}
                    </p>
                    <p className="text-[#C0C0C0] text-sm">
                      Level {req.plan?.access_level}
                    </p>
                  </div>
                </div>

                {req.reason && (
                  <p className="text-[#C0C0C0] mb-4 bg-[#3a0809] p-3 rounded">
                    Reason: {req.reason}
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => handleApprove(req.id, req.member_id)}
                    disabled={processing === req.id}
                    className="flex-1 bg-green-600 text-white font-bold py-2 rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    {processing === req.id ? "PROCESSING..." : "APPROVE"}
                  </button>
                  <button
                    onClick={() => handleReject(req.id)}
                    disabled={processing === req.id}
                    className="flex-1 bg-red-600 text-white font-bold py-2 rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    {processing === req.id ? "PROCESSING..." : "REJECT"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
