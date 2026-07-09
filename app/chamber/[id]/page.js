"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";
import { supabase } from "../../../lib/supabase/client";

export default function ChamberPage({ params }) {
  const { id } = use(params);
  const router = useRouter();

  const [session, setSession] = useState(undefined);
  const [chamber, setChamber] = useState(null);
  const [accessLevel, setAccessLevel] = useState(null);
  const [posts, setPosts] = useState([]);
  const [deniedReason, setDeniedReason] = useState(null);
  const [loading, setLoading] = useState(true);

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
      const res = await fetch(`/api/chamber/${id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      const body = await res.json();

      if (!res.ok) {
        setDeniedReason(body.error || "Access denied.");
        setLoading(false);
        return;
      }

      setChamber(body.chamber);
      setAccessLevel(body.accessLevel);
      setPosts(body.posts);
      setLoading(false);
    })();
  }, [session, id]);

  if (session === undefined || loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        Verifying access...
      </main>
    );
  }

  if (deniedReason) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl text-red-500 font-bold">Access Denied</h1>
          <p className="mt-4">{deniedReason}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070707] text-white p-6">
      <section className="max-w-xl mx-auto bg-[#5B0A18] border border-[#D4AF37] rounded-3xl p-8">
        <h1 className="text-3xl text-[#D4AF37] font-bold">
          🏛 {chamber.name}
        </h1>

        <p className="text-gray-300 mt-3">{chamber.description}</p>

        {chamber.required_office && (
          <p className="mt-2 text-sm text-gray-400">
            Requires: {chamber.required_office}
          </p>
        )}

        <p className="mt-5 text-[#D4AF37]">Access Level: {accessLevel}</p>

        <div className="mt-8 bg-black rounded-2xl p-5">
          <h2 className="text-xl text-[#D4AF37] font-bold mb-5">
            Official Chamber Notices
          </h2>

          {posts.map((post) => (
            <div key={post.id} className="border-b border-gray-700 pb-5 mb-5">
              <h3 className="font-bold">{post.title}</h3>
              <p className="text-gray-300 mt-3">{post.content}</p>
              <p className="text-[#D4AF37] mt-3 text-sm">
                Issued by: {post.issued_by}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
