export default function MemberCard({
  member
}) {

return (

<div className="
max-w-sm
mx-auto
rounded-3xl
border
border-yellow-500/30
bg-black/40
p-8
text-center
">

<div className="text-yellow-400 text-5xl">
♛
</div>

<h2 className="mt-4 text-2xl">
THE PALACE
</h2>

<div className="mt-6">

<p className="text-gray-400">
Royal ID
</p>

<p className="text-yellow-400 tracking-widest">
{member.royal_id}
</p>

</div>


<div className="mt-6">

<p>
{member.full_name}
</p>

<p className="text-gray-400">
{member.membership_level}
</p>

</div>

</div>

)

}
