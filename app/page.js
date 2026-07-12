import PalaceLogo from "../components/ui/PalaceLogo";
import RoyalButton from "../components/ui/RoyalButton";
import GlassCard from "../components/ui/GlassCard";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">

      <GlassCard>

        <PalaceLogo />

        <div className="text-center">

          <Link href="/login">
            <RoyalButton>
              ENTER
            </RoyalButton>
          </Link>

        </div>

      </GlassCard>

    </main>
  );
}
