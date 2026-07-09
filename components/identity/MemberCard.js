export default function MemberCard({ member, standing }) {
  return (
    <div className="relative w-full max-w-sm mx-auto">
      <div
        className="
          rounded-[2rem]
          p-8
          border
          border-yellow-500/50
          bg-gradient-to-br
          from-[#7a1025]
          via-[#5B0A18]
          to-black
          shadow-2xl
        "
      >
        <div className="absolute inset-0 rounded-[2rem] border border-white/10 pointer-events-none" />

        <div className="text-center">
          <div className="text-6xl text-yellow-400">♛</div>

          <h1 className="mt-4 text-3xl tracking-[0.35em]">THE PALACE</h1>

          <p className="text-gray-300 tracking-widest text-sm">
            PRIVATE DIGITAL REALM
          </p>
        </div>

        <div className="mt-8 border-t border-yellow-500/30 pt-6 grid grid-cols-2 gap-4">
          <div>
            <p className="text-gray-400 text-sm">STANDING</p>
            <h2 className="text-lg mt-2">
              {standing?.standing_levels?.name || "Member Standing"}
            </h2>
          </div>
          <div>
            <p className="text-gray-400 text-sm">ROYAL OFFICE</p>
            <h2 className="text-lg mt-2">{member.royal_office || "Observer"}</h2>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-gray-400 text-sm">ROYAL ID</p>
          <p className="text-yellow-400 tracking-widest">{member.royal_id}</p>
        </div>

        <div className="mt-6 flex justify-between">
          <div>
            <p className="text-gray-400 text-xs">LEVEL</p>
            <p>{member.membership_level}</p>
          </div>

          <div>
            <p className="text-gray-400 text-xs">STATUS</p>
            <p className="text-yellow-400">
              {member.membership_status || "ACTIVE"}
            </p>
          </div>
        </div>

        <div className="mt-8 text-center text-gray-400 text-xs tracking-widest">
          AUTHORIZED PALACE MEMBER
        </div>
      </div>
    </div>
  );
}
