export default function GlassCard({ children }) {

  return (

    <div
      className="
      rounded-3xl
      border
      border-white/10
      bg-white/5
      backdrop-blur-md
      p-8
      shadow-2xl
      "
    >
      {children}
    </div>

  );

}
