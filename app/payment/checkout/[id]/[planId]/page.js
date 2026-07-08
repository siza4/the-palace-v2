"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function CheckoutPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const params = useParams();
  const memberId = params?.id;
  const planId = params?.planId;

  async function handlePayment() {
    setLoading(true);
    try {
      const res = await fetch("/api/payment/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId,
          planId
        })
      });

      if (!res.ok) throw new Error("Payment initialization failed");
      const data = await res.json();

      // TODO: Redirect to Stripe or payment processor
      // For now, show success
      router.push(`/payment/confirm/${memberId}/${planId}`);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#070707] flex items-center justify-center p-6">
      <section className="w-full max-w-md bg-[#5B0A18] border border-[#D4AF37] rounded-2xl p-8">
        <h1 className="text-2xl text-center text-[#D4AF37] font-bold mb-6">Complete Payment</h1>

        {error && <div className="text-red-500 mb-4 p-3 bg-red-900 rounded">{error}</div>}

        <button
          onClick={handlePayment}
          disabled={loading}
          className="w-full bg-[#D4AF37] text-black font-bold py-3 rounded hover:bg-[#E8C547] disabled:opacity-50"
        >
          {loading ? "PROCESSING..." : "PROCEED TO PAYMENT"}
        </button>

        <button
          onClick={() => router.back()}
          className="w-full mt-4 bg-transparent border border-[#D4AF37] text-[#D4AF37] font-bold py-3 rounded hover:bg-[#5B0A18] transition"
        >
          CANCEL
        </button>
      </section>
    </main>
  );
}
