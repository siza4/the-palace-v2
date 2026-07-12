"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSendLink() {
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/throne`
            : undefined
      }
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSent(true);
  }

  return (
    <main className="min-h-screen bg-[#070707] flex items-center justify-center p-6">
      <section className="w-full max-w-md bg-[#5B0A18] border border-[#D4AF37] rounded-2xl p-8 shadow-xl">
        <h1 className="text-3xl text-center text-[#D4AF37] font-bold mb-3">
          THE PALACE
        </h1>
        <p className="text-center text-[#C0C0C0] mb-8">
          Palace Sign In
        </p>

        {sent ? (
          <p className="text-center text-[#D4AF37]">
            Check your email for a secure sign-in link.
          </p>
        ) : (
          <>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full bg-black/40 border border-[#D4AF37]/40 rounded-lg px-4 py-3 text-white mb-4"
            />

            {error && (
              <p className="text-red-400 text-sm mb-4">{error}</p>
            )}

            <button
              onClick={handleSendLink}
              disabled={loading || !email}
              className="w-full bg-[#D4AF37] text-black font-bold py-3 rounded-lg disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Sign-In Link"}
            </button>

            <p className="text-center text-gray-400 text-xs mt-6">
              This grants no privileges by itself. Access to Offices,
              approvals, and Treasury still requires holding the relevant
              Permission on your Palace record.
            </p>
          </>
        )}
      </section>
    </main>
  );
}
