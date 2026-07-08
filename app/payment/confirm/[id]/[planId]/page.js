"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ConfirmationPage() {
  const router = useRouter();
  const params = useParams();
  const memberId = params?.id;
  const planId = params?.planId;

  useEffect(() => {
    // Auto-redirect after 3 seconds
    const timer = setTimeout(() => {
      router.push(`/throne/${memberId}`);
    }, 3000);
    return () => clearTimeout(timer);
  }, [memberId, router]);

  return (
    <main className="min-h-screen bg-[#070707] flex items-center justify-center p-6">
      <section className="w-full max-w-md bg-[#5B0A18] border border-[#D4AF37] rounded-2xl p-8 text-center">
        <div className="text-6xl mb-6">✓</div>
        <h1 className="text-3xl text-[#D4AF37] font-bold mb-3">Welcome to The Palace</h1>
        <p className="text-[#C0C0C0] mb-6">Your membership has been activated successfully.</p>
        <p className="text-[#888888]">Redirecting to your throne...</p>
      </section>
    </main>
  );
}
