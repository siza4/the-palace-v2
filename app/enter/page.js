"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { enterPalace } from "../../lib/engine/entry";

export default function EnterPage() {
  const [identifier, setIdentifier] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleEnter() {
    setLoading(true);
    setMessage("Verifying Royal Identity...");
    setError("");

    try {
      const result = await enterPalace(identifier);

      if (!result.success) {
        setError(result.message);
        setMessage("");
        setLoading(false);

        // Check if membership renewal needed
        if (result.membershipStatus === 'expired') {
          setTimeout(() => {
            router.push(`/payment/renew/${result.member?.id}`);
          }, 2000);
        }
        return;
      }

      setMessage("Access Granted");
      setTimeout(() => {
        router.push(`/throne/${result.member.id}`);
      }, 1000);
    } catch (err) {
      setError("Connection error. Please try again.");
      setLoading(false);
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !loading) {
      handleEnter();
    }
  };

  return (
    <main className="min-h-screen bg-[#070707] flex items-center justify-center p-6">
      <section className="w-full max-w-md bg-[#5B0A18] border border-[#D4AF37] rounded-2xl p-8 shadow-xl">
        <h1 className="text-3xl text-center text-[#D4AF37] font-bold mb-3">
          THE PALACE
        </h1>

        <p className="text-center text-[#C0C0C0] mb-8">
          Private Royal Entrance
        </p>

        <input
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter Royal ID or Pass"
          className="w-full bg-black text-white border border-[#D4AF37] rounded p-3"
          disabled={loading}
        />

        <button
          onClick={handleEnter}
          disabled={loading || !identifier}
          className="w-full mt-5 bg-[#D4AF37] text-black font-bold py-3 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#E8C547] transition"
        >
          {loading ? "VERIFYING..." : "ENTER PALACE"}
        </button>

        {error && (
          <p className="text-center text-red-500 mt-5">{error}</p>
        )}

        {message && !error && (
          <p className="text-center text-[#D4AF37] mt-5">{message}</p>
        )}

        <p className="text-center text-[#888888] text-sm mt-8">
          New to The Palace?{" "}
          <a href="/admission" className="text-[#D4AF37] hover:underline">
            Request Entry
          </a>
        </p>
      </section>
    </main>
  );
}
