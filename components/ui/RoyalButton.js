export default function RoyalButton({
  children,
  onClick,
}) {

  return (

    <button
      onClick={onClick}
      className="
      mt-8
      px-10
      py-4
      border
      border-yellow-500
      text-yellow-400
      tracking-[0.25em]
      rounded-full
      transition-all
      duration-300
      hover:bg-yellow-500
      hover:text-black
      "
    >
      {children}
    </button>

  );

}

