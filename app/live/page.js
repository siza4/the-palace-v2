export default function LivePage() {
  return (
    <main className="min-h-screen bg-[#070707] flex items-center justify-center p-6">
      <section className="w-full max-w-2xl bg-[#5B0A18] border border-[#D4AF37] rounded-2xl p-8 shadow-xl text-center">
        <h1 className="text-3xl text-[#D4AF37] font-bold mb-3">
          LIVE
        </h1>
        <p className="text-[#C0C0C0] mb-2">
          Real-time activity within The Palace.
        </p>
        <p className="text-[#888888] text-sm">
          Live institutional activity is being prepared and will appear here.
        </p>
        <a
          href="/enter"
          className="inline-block mt-8 bg-[#D4AF37] text-black font-bold py-3 px-6 rounded hover:bg-[#E8C547] transition"
        >
          Return to Entrance
        </a>
      </section>
    </main>
  );
}
