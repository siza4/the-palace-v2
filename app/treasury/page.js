"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase/client";
import { loadStripe } from "@stripe/stripe-js";

export default function TreasuryPage() {
  const [session, setSession] = useState(undefined);
  const [days, setDays] = useState(30);
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const DAILY_RATE = 1.0;

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
      const res = await fetch("/api/standing/advance", {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      const body = await res.json();
      if (res.ok) setStatus(body.standing);
    })();
  }, [session]);

  async function handleContribute(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/treasury/contribute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ days: Number(days) })
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to start contribution");

      if (body.type === "unconfigured") {
        setError(body.error);
        return;
      }

      if (body.type === "stripe" && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
        const stripe = await loadStripe(
          process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
        );
        await stripe.confirmPayment({
          clientSecret: body.clientSecret,
          confirmParams: { return_url: `${window.location.origin}/throne` }
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (session === undefined) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        Verifying access...
      </main>
    );
  }

  const amount = (Number(days) || 0) * DAILY_RATE;

  return (
    <main className="min-h-screen bg-[#070707] text-[#EDEDED] flex items-center justify-center p-6">
      <section className="w-full max-w-md bg-[#5B0A18] border border-[#D4AF37] rounded-2xl p-8">
        <h1
          className="text-3xl text-center text-[#D4AF37] font-bold mb-2"
          style={{ fontFamily: "Cinzel, serif" }}
        >
          Royal Treasury
        </h1>

        <p className="text-center text-gray-300 text-sm mb-8">
          Contribution grants participation. It does not purchase
          importance.
        </p>

        {status?.status === "active" && (
          <div className="bg-black/30 rounded-lg p-4 mb-6 text-center">
            <p className="text-gray-400 text-xs">CURRENT STANDING</p>
            <p className="text-[#D4AF37] text-lg mt-1">
              {status.standing_levels?.name}
            </p>
          </div>
        )}

        <form onSubmit={handleContribute}>
          <label className="text-gray-400 text-sm block mb-2">
            Days of Royal Standing to secure
          </label>
          <input
            type="number"
            min="1"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="w-full bg-black/40 border border-[#D4AF37]/40 rounded-lg px-4 py-3 text-white mb-4"
          />

          <div className="flex justify-between text-sm text-gray-300 mb-6">
            <span>Daily rate</span>
            <span>${DAILY_RATE.toFixed(2)}/day</span>
          </div>

          <div className="flex justify-between text-lg text-[#D4AF37] font-bold mb-6">
            <span>Contribution amount</span>
            <span>${amount.toFixed(2)}</span>
          </div>

          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

          <button
            type="submit"
            disabled={submitting || amount <= 0}
            className="w-full bg-[#D4AF37] text-black font-bold py-3 rounded-lg disabled:opacity-50"
          >
            {submitting ? "Processing..." : "Continue Contribution"}
          </button>
        </form>

        <p className="text-center text-gray-500 text-xs mt-6">
          Circle, Council, and Authority Standing are never purchased —
          they are earned through recognition and appointment.
        </p>
      </section>
    </main>
  );
}
