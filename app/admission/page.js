"use client";

import { useState } from "react";

export default function AdmissionPage() {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    country: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Admission request failed.");
        setLoading(false);
        return;
      }

      setResult(data.request);
      setLoading(false);
    } catch (err) {
      setError("Connection error. Please try again.");
      setLoading(false);
    }
  }

  if (result) {
    return (
      <main className="min-h-screen bg-[#070707] flex items-center justify-center p-6">
        <section className="w-full max-w-md bg-[#5B0A18] border border-[#D4AF37] rounded-2xl p-8 shadow-xl text-center">
          <h1 className="text-2xl text-[#D4AF37] font-bold mb-3">
            Admission Requested
          </h1>
          <p className="text-[#C0C0C0] mb-6">
            Your request has been submitted for review. The Admissions Office
            reviews new requests, and Palace Authority makes the final
            decision. Nothing is created yet — you'll be notified once a
            decision is made.
          </p>
          <p className="text-[#888888] text-sm">
            Status: {result.status}
          </p>
          <a
            href="/enter"
            className="block w-full mt-8 bg-[#D4AF37] text-black font-bold py-3 rounded hover:bg-[#E8C547] transition"
          >
            Return to Entrance
          </a>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070707] flex items-center justify-center p-6">
      <section className="w-full max-w-md bg-[#5B0A18] border border-[#D4AF37] rounded-2xl p-8 shadow-xl">
        <h1 className="text-3xl text-center text-[#D4AF37] font-bold mb-3">
          REQUEST ENTRY
        </h1>

        <p className="text-center text-[#C0C0C0] mb-8">
          Royal Admission Office
        </p>

        <div className="space-y-4">
          <input
            value={form.full_name}
            onChange={(e) => updateField("full_name", e.target.value)}
            placeholder="Full Name"
            className="w-full bg-black text-white border border-[#D4AF37] rounded p-3"
            disabled={loading}
          />
          <input
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
            placeholder="Email"
            type="email"
            className="w-full bg-black text-white border border-[#D4AF37] rounded p-3"
            disabled={loading}
          />
          <input
            value={form.phone}
            onChange={(e) => updateField("phone", e.target.value)}
            placeholder="Phone (optional)"
            className="w-full bg-black text-white border border-[#D4AF37] rounded p-3"
            disabled={loading}
          />
          <input
            value={form.country}
            onChange={(e) => updateField("country", e.target.value)}
            placeholder="Country"
            className="w-full bg-black text-white border border-[#D4AF37] rounded p-3"
            disabled={loading}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !form.full_name || !form.email}
          className="w-full mt-6 bg-[#D4AF37] text-black font-bold py-3 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#E8C547] transition"
        >
          {loading ? "SUBMITTING..." : "REQUEST ADMISSION"}
        </button>

        {error && <p className="text-center text-red-500 mt-5">{error}</p>}

        <p className="text-center text-[#888888] text-sm mt-8">
          Already a member?{" "}
          <a href="/enter" className="text-[#D4AF37] hover:underline">
            Enter Palace
          </a>
        </p>
      </section>
    </main>
  );
}
