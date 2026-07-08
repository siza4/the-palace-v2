"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function SelectMembershipPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPlan, setSelectedPlan] = useState(null);
  const router = useRouter();
  const params = useParams();
  const memberId = params?.id;

  useEffect(() => {
    fetchPlans();
  }, []);

  async function fetchPlans() {
    try {
      const res = await fetch("/api/membership/plans");
      if (!res.ok) throw new Error("Failed to fetch plans");
      const data = await res.json();
      setPlans(data.plans || []);
    } catch (err) {
      setError("Failed to load membership plans");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectPlan(planId) {
    setSelectedPlan(planId);
    // Route to payment or approval flow
    const plan = plans.find(p => p.id === planId);
    if (plan.requires_approval) {
      router.push(`/payment/approval/${memberId}/${planId}`);
    } else if (plan.price > 0) {
      router.push(`/payment/checkout/${memberId}/${planId}`);
    } else {
      // Free plan - activate immediately
      router.push(`/payment/confirm/${memberId}/${planId}`);
    }
  }

  if (loading) return <div className="min-h-screen bg-[#070707] flex items-center justify-center"><p className="text-[#D4AF37]">Loading membership tiers...</p></div>;

  return (
    <main className="min-h-screen bg-[#070707] p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl text-center text-[#D4AF37] font-bold mb-2">Join The Palace</h1>
        <p className="text-center text-[#C0C0C0] mb-12">Select your membership tier</p>

        {error && <div className="text-red-500 text-center mb-6">{error}</div>}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="bg-[#5B0A18] border border-[#D4AF37] rounded-lg p-6 hover:shadow-lg transition"
            >
              <h2 className="text-2xl text-[#D4AF37] font-bold mb-2">{plan.name}</h2>
              <p className="text-[#C0C0C0] mb-4 h-12">{plan.description}</p>

              <div className="mb-6">
                {plan.price > 0 ? (
                  <div>
                    <span className="text-3xl text-[#D4AF37] font-bold">${plan.price}</span>
                    <span className="text-[#C0C0C0] ml-2">/{plan.billing_period}</span>
                  </div>
                ) : (
                  <div className="text-2xl text-[#D4AF37] font-bold">Free</div>
                )}
              </div>

              {plan.requires_approval && (
                <div className="text-[#D4AF37] text-sm mb-4 bg-[#3a0809] p-2 rounded">
                  ⚠️ Requires approval
                </div>
              )}

              <button
                onClick={() => handleSelectPlan(plan.id)}
                disabled={selectedPlan === plan.id}
                className="w-full bg-[#D4AF37] text-black font-bold py-3 rounded hover:bg-[#E8C547] disabled:opacity-50 transition"
              >
                {selectedPlan === plan.id ? "PROCESSING..." : "SELECT"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
