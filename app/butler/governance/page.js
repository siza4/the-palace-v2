"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase/client";

export default function GovernancePage() {
  const [session, setSession] = useState(undefined);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "institutional"
  });
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
    if (session) fetchProposals();
  }, [session]);

  async function authHeaders() {
    const { data } = await supabase.auth.getSession();
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.session?.access_token}`
    };
  }

  async function fetchProposals() {
    try {
      const res = await fetch("/api/governance/proposals", {
        headers: await authHeaders()
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setProposals(body.proposals || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    try {
      const res = await fetch("/api/governance/proposals", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify(form)
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setForm({ title: "", description: "", category: "institutional" });
      setShowForm(false);
      fetchProposals();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleReview(id, recommendation) {
    try {
      const res = await fetch(`/api/governance/proposals/${id}/review`, {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ recommendation })
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      fetchProposals();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDecide(id, decision) {
    try {
      const res = await fetch(`/api/governance/proposals/${id}/decide`, {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ decision })
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      fetchProposals();
    } catch (err) {
      alert(err.message);
    }
  }

  if (session === undefined || loading) {
    return <div className="p-6 text-[#D4AF37]">Verifying access...</div>;
  }

  return (
    <main className="min-h-screen bg-[#070707] p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl text-[#D4AF37] font-bold">
            Governance — Proposals
          </h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-[#D4AF37] text-black px-4 py-2 rounded-lg font-semibold"
          >
            {showForm ? "Cancel" : "New Proposal"}
          </button>
        </div>

        {error && <p className="text-red-400 mb-4">{error}</p>}

        {showForm && (
          <form
            onSubmit={handleCreate}
            className="bg-[#5B0A18] border border-[#D4AF37]/40 rounded-lg p-6 mb-6 space-y-3"
          >
            <input
              required
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full bg-black/40 border border-[#D4AF37]/40 rounded px-3 py-2 text-white"
            />
            <textarea
              required
              placeholder="Description"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="w-full bg-black/40 border border-[#D4AF37]/40 rounded px-3 py-2 text-white"
              rows={3}
            />
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full bg-black/40 border border-[#D4AF37]/40 rounded px-3 py-2 text-white"
            >
              <option value="institutional">
                Institutional (e.g. new Chamber, membership structure change)
              </option>
              <option value="constitutional">
                Constitutional (core principle change — requires all Council)
              </option>
            </select>
            <button
              type="submit"
              className="bg-[#D4AF37] text-black px-4 py-2 rounded-lg font-semibold"
            >
              Submit Proposal
            </button>
          </form>
        )}

        {proposals.length === 0 && (
          <p className="text-gray-400">No proposals yet.</p>
        )}

        {proposals.map((p) => (
          <div
            key={p.id}
            className="bg-[#5B0A18] border border-[#D4AF37]/40 rounded-lg p-6 mb-4"
          >
            <div className="flex justify-between">
              <h3 className="text-white font-semibold text-lg">{p.title}</h3>
              <span className="text-xs uppercase text-[#D4AF37]">
                {p.category} · {p.status}
              </span>
            </div>

            <p className="text-gray-300 text-sm mt-2">{p.description}</p>

            <p className="text-gray-400 text-xs mt-3">
              {p.governance_reviews?.length || 0} review(s) recorded
            </p>

            {p.status === "under_review" && (
              <div className="flex gap-2 mt-4 flex-wrap">
                <button
                  onClick={() => handleReview(p.id, "support")}
                  className="bg-transparent border border-green-400 text-green-400 px-3 py-1 rounded text-sm"
                >
                  Review: Support
                </button>
                <button
                  onClick={() => handleReview(p.id, "oppose")}
                  className="bg-transparent border border-red-400 text-red-400 px-3 py-1 rounded text-sm"
                >
                  Review: Oppose
                </button>
                <button
                  onClick={() => handleDecide(p.id, "approved")}
                  className="bg-[#D4AF37] text-black px-3 py-1 rounded text-sm font-semibold"
                >
                  Authority: Approve
                </button>
                <button
                  onClick={() => handleDecide(p.id, "rejected")}
                  className="bg-transparent border border-red-500 text-red-500 px-3 py-1 rounded text-sm"
                >
                  Authority: Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
