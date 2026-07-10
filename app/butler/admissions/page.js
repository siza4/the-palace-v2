"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase/client";

const STATUS_FILTERS = ["submitted", "under_review", "approved", "rejected"];

export default function AdmissionsQueuePage() {
  const [session, setSession] = useState(undefined);
  const [requests, setRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState("submitted");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(null);
  const [infoDraft, setInfoDraft] = useState({});
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, statusFilter]);

  async function authHeaders() {
    const { data } = await supabase.auth.getSession();
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.session?.access_token}`
    };
  }

  async function fetchRequests() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admission?status=${statusFilter}`, {
        headers: await authHeaders()
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setRequests(body.requests || []);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function review(id) {
    setProcessing(id);
    try {
      const res = await fetch(`/api/admission/${id}/review`, {
        method: "POST",
        headers: await authHeaders()
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      fetchRequests();
    } catch (err) {
      alert(err.message);
    } finally {
      setProcessing(null);
    }
  }

  async function decide(id, approve) {
    setProcessing(id);
    try {
      const res = await fetch(`/api/admission/${id}`, {
        method: approve ? "POST" : "PUT",
        headers: await authHeaders(),
        body: JSON.stringify({
          decisionReason: approve ? "Approved by the Butler's Office" : "Rejected by the Butler's Office"
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

  async function requestInfo(id) {
    const message = infoDraft[id];
    if (!message) return;
    setProcessing(id);
    try {
      const res = await fetch(`/api/admission/${id}/info`, {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ message })
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setInfoDraft((prev) => ({ ...prev, [id]: "" }));
      fetchRequests();
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
          Admissions
        </h1>
        <p className="text-gray-400 text-sm mb-6">
          Visitor → Admission Request → Butler Investigation → Decision →
          Identity Creation → Standing Granted → Royal Pass Issued. No
          identity exists until a request is approved here.
        </p>

        <div className="flex gap-2 mb-6">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold border ${
                statusFilter === s
                  ? "bg-[#D4AF37] text-black border-[#D4AF37]"
                  : "bg-transparent text-[#D4AF37] border-[#D4AF37]/40"
              }`}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>

        {error && <p className="text-red-400 mb-4">{error}</p>}

        {requests.length === 0 && (
          <p className="text-gray-400">No requests in this state.</p>
        )}

        {requests.map((r) => (
          <div
            key={r.id}
            className="bg-[#5B0A18] border border-[#D4AF37]/40 rounded-lg p-6 mb-4"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-white font-semibold">{r.full_name}</p>
                <p className="text-gray-400 text-sm">{r.email}</p>
              </div>
              <p className="text-gray-500 text-xs">
                Submitted {new Date(r.created_at).toLocaleDateString()}
              </p>
            </div>

            <p className="text-gray-400 text-sm mb-1">
              Country: {r.country || "—"}
            </p>

            {r.applicant_notes && (
              <p className="text-gray-300 text-sm mb-2 italic">
                "{r.applicant_notes}"
              </p>
            )}

            {r.review_notes && (
              <p className="text-[#D4AF37] text-sm mb-2">
                Review note: {r.review_notes}
              </p>
            )}

            <p className="text-gray-500 text-xs mb-4">
              Status: {r.status.replace("_", " ")}
            </p>

            {(r.status === "submitted" || r.status === "under_review") && (
              <>
                <div className="flex gap-3 mb-3">
                  {r.status === "submitted" && (
                    <button
                      disabled={processing === r.id}
                      onClick={() => review(r.id)}
                      className="bg-transparent border border-[#D4AF37] text-[#D4AF37] px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
                    >
                      Review
                    </button>
                  )}
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

                <div className="flex gap-2">
                  <input
                    value={infoDraft[r.id] || ""}
                    onChange={(e) =>
                      setInfoDraft((prev) => ({ ...prev, [r.id]: e.target.value }))
                    }
                    placeholder="Request information from applicant..."
                    className="flex-1 bg-black text-white border border-[#D4AF37]/40 rounded p-2 text-sm"
                  />
                  <button
                    disabled={processing === r.id || !infoDraft[r.id]}
                    onClick={() => requestInfo(r.id)}
                    className="bg-transparent border border-[#D4AF37]/40 text-[#D4AF37] px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                  >
                    Request Information
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
