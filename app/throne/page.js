"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase/client";

export default function ThronePage() {
  const [member, setMember] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [chambers, setChambers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push("/login");
        return;
      }

      const res = await fetch("/api/throne", {
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      });
      const body = await res.json();

      if (!res.ok) {
        setError(body.error || "Unable to load your Throne Room.");
        setLoading(false);
        return;
      }

      setMember(body.member);
      setAnnouncements(body.announcements || []);
      setChambers(body.chambers || []);
      setLoading(false);
    }

    load();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center text-[#D4AF37]">
        Entering The Palace...
      </main>
    );
  }

  if (error || !member) {
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-center text-white gap-3">
        <p>{error || "Royal Identity Not Found"}</p>
        {error?.includes("renewal") && (
          <a href="/treasury" className="text-[#D4AF37] underline">
            Go to Treasury
          </a>
        )}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070707] text-white p-6">
      <section className="max-w-xl mx-auto">
        <div className="bg-[#5B0A18] border border-[#D4AF37] rounded-3xl p-8">
          <h1 className="text-3xl text-[#D4AF37] font-bold text-center">👑 THE PALACE</h1>
          <p className="text-center text-gray-300 mt-2">Royal Throne</p>

          <div className="mt-8 bg-black rounded-2xl p-6 border border-[#D4AF37]">
            <p className="text-gray-400">Welcome Back</p>
            <h2 className="text-2xl mt-2">{member.full_name}</h2>

            <div className="mt-6 space-y-4">
              <p>
                <span className="text-gray-400">Royal Identity:</span>
                <br />
                {member.royal_id}
              </p>
              <p>
                <span className="text-gray-400">Royal Office:</span>
                <br />
                👑 {member.royal_office}
              </p>
              <p>
                <span className="text-gray-400">Status:</span>
                <br />
                <span className="text-green-400">● {member.membership_status}</span>
              </p>
            </div>
          </div>

          <div className="mt-8 bg-black border border-[#D4AF37] rounded-2xl p-5">
            <h2 className="text-xl text-[#D4AF37] font-bold mb-5">📜 Royal Announcements</h2>
            {announcements.map((item) => (
              <div key={item.id} className="border-b border-gray-700 pb-4 mb-4">
                <h3 className="font-bold">{item.title}</h3>
                <p className="text-gray-300 mt-2">{item.message}</p>
                <p className="text-sm text-[#D4AF37] mt-3">Issued by: {item.issued_by}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 bg-black border border-[#D4AF37] rounded-2xl p-5">
            <h2 className="text-xl text-[#D4AF37] font-bold mb-5">🏛 Royal Chambers</h2>
            {chambers.map((item) => (
              <div key={item.id} className="border border-gray-700 rounded-xl p-4 mb-4">
                <h3 className="font-bold text-lg">{item.chambers.name}</h3>
                <p className="text-gray-300 mt-2">{item.chambers.description}</p>
                <p className="text-[#D4AF37] mt-3">Access: {item.access_level}</p>
                <a
                  href={`/chamber/${item.chambers.id}`}
                  className="inline-block mt-5 bg-[#D4AF37] text-black font-bold px-5 py-2 rounded-xl"
                >
                  ENTER CHAMBER
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
