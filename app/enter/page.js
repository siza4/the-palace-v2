"use client";

import { useState } from "react";
import PalaceLogo from "../../components/ui/PalaceLogo";
import GlassCard from "../../components/ui/GlassCard";
import RoyalButton from "../../components/ui/RoyalButton";

export default function EnterPage() {

  const [royalId, setRoyalId] = useState("");
  const [password, setPassword] = useState("");

  return (

    <main className="min-h-screen flex items-center justify-center px-6">

      <GlassCard>

        <PalaceLogo size="small" />

        <div className="mt-10">

          <input
            type="text"
            placeholder="Royal ID"
            value={royalId}
            onChange={(e)=>setRoyalId(e.target.value)}
            className="w-full p-4 rounded-xl mb-4 bg-black/30 border border-yellow-500/30 text-white outline-none"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e)=>setPassword(e.target.value)}
            className="w-full p-4 rounded-xl bg-black/30 border border-yellow-500/30 text-white outline-none"
          />

          <div className="text-center">

            <RoyalButton>
              ENTER THE PALACE
            </RoyalButton>

          </div>

          <div className="mt-8 text-center">

            <p className="text-gray-400">
              First visit?
            </p>

            <button className="mt-3 text-yellow-400">
              Request Royal Admission
            </button>

          </div>

        </div>

      </GlassCard>

    </main>

  );

}
