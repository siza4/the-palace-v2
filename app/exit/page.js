"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase/client";

export default function ExitPage() {
  const [message, setMessage] = useState("Departing The Palace...");
  const router = useRouter();

  useEffect(() => {
    async function exit() {
      await supabase.auth.signOut();
      setMessage("You have exited The Palace.");
      setTimeout(() => {
        router.push("/enter");
      }, 1500);
    }
    exit();
  }, [router]);

  return (
    <main className="min-h-screen bg-[#070707] flex items-center justify-center p-6">
      <section className="w-full max-w-md bg-[#5B0A18] border border-[#D4AF37] rounded-2xl p-8 shadow-xl text-center">
        <h1 className="text-2xl text-[#D4AF37] font-bold mb-3">
          THE PALACE
        </h1>
        <p className="text-[#C0C0C0]">{message}</p>
      </section>
    </main>
  );
}
