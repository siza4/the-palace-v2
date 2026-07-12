"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase/client";

export default function AdmissionsReviewPage() {
  const [session, setSession] = useState(undefined);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notes, setNotes] = useState({});
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
      Authorization: `Bearer ${data.session?.access_token}`,
    };
  }

  async function fetchRequests() {
    setError("");
    try {
      const res = await fetch("/api/butler/admission-requests", {
        headers: await authHeaders(),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to load admission requests.");
      setRequests(body.requests || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleReview(id, recommendation) {
    setActionError("");
    try {
      const res = await fetch(`/api/butler/admission-requests/${id}/review`, {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ recommendation, notes: notes[id] || "" }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Review failed.");
      fetchRequests();
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function handleDecide(id, decision) {
    setActionError("");
    try {
      const res = await fetch(`/api/butler/admission-requests/${id}/decide`, {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ decision, notes: notes[id] || "" }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Decision failed.");
      fetchRequests();
    } catch (err) {
      setActionError(err.message);
    }
  }

  if (session === undefined || loading) {
    return (
      <main className="min-h-screen bg-[#070707] flex items-center justify-center">
        <p className="text-[#D4AF37]">Loading admission requests...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070707] p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl text-[#D4AF37] font-bold mb-1">Admission Review</h1>
        <p className="text-[#888888] mb-6">
          Admissions Office / Butler's Office review, then Palace Authority decides.
          Reviewing does not approve membership — only a final decision creates a Member.
        </p>

        {error && (
          <p className="text-red-500 mb-4">
            {error}
            {error.includes("do not hold") &&
              " — this page is visible to any logged-in member, but actions require the right Permission and Office."}
          </p>
        )}
        {actionError && <p className="text-red-500 mb-4">{actionError}</p>}

        {!error && requests.length === 0 && (
          <p className="text-[#888888]">No admission requests at this time.</p>
        )}

        <div className="space-y-4">
          {requests.map((r) => (
            <div
              key={r.id}
              className="bg-[#1a1a1a] border border-[#333] rounded-lg p-5"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-white font-semibold">{r.full_name}</p>
                  <p className="text-[#888888] text-sm">
                    {r.email} · {r.phone} · {r.country}
                  </p>
                </div>
                <span className="text-xs px-2 py-1 rounded bg-[#333] text-[#D4AF37] uppercase">
                  {r.status.replace(/_/g, " ")}
                </span>
              </div>

              {r.review_notes && (
                <p className="text-sm text-[#aaaaaa] mb-2">
                  Review notes: {r.review_notes}
                </p>
              )}
              {r.decision_notes && (
                <p className="text-sm text-[#aaaaaa] mb-2">
                  Decision notes: {r.decision_notes}
                </p>
              )}

              <textarea
                placeholder="Notes (optional)"
                value={notes[r.id] || ""}
                onChange={(e) =>
                  setNotes((prev) => ({ ...prev, [r.id]: e.target.value }))
                }
                className="w-full bg-black text-white border border-[#333] rounded p-2 text-sm mt-2 mb-3"
                rows={2}
              />

              <div className="flex flex-wrap gap-2">
                {r.status === "submitted" && (
                  <>
                    <button
                      onClick={() => handleReview(r.id, "accept")}
                      className="px-3 py-1.5 bg-[#2a5c2a] text-white rounded text-sm"
                    >
                      Recommend Accept
                    </button>
                    <button
                      onClick={() => handleReview(r.id, "reject")}
                      className="px-3 py-1.5 bg-[#5c2a2a] text-white rounded text-sm"
                    >
                      Recommend Reject
                    </button>
                    <button
                      onClick={() => handleReview(r.id, "request_info")}
                      className="px-3 py-1.5 bg-[#3a3a3a] text-white rounded text-sm"
                    >
                      Request More Info
                    </button>
                  </>
                )}

                {r.status === "under_review" && (
                  <>
                    <button
                      onClick={() => handleDecide(r.id, "approved")}
                      className="px-3 py-1.5 bg-[#D4AF37] text-black rounded text-sm font-semibold"
                    >
                      Authority: Approve
                    </button>
                    <button
                      onClick={() => handleDecide(r.id, "rejected")}
                      className="px-3 py-1.5 bg-[#5c2a2a] text-white rounded text-sm"
                    >
                      Authority: Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
