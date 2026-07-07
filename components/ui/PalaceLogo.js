export default function PalaceLogo({
  size = "large",
  subtitle = true,
}) {
  return (
    <div className="text-center">

      <div
        className={
          size === "large"
            ? "text-7xl text-yellow-500"
            : "text-5xl text-yellow-500"
        }
      >
        ♛
      </div>

      <h1 className="mt-6 text-5xl tracking-[0.45em] font-serif">
        THE PALACE
      </h1>

      {subtitle && (
        <p className="mt-5 text-gray-400">
          Private Digital Realm
        </p>
      )}

    </div>
  );
}
