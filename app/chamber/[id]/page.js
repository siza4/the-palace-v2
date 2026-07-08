import { supabase } from "../../../lib/supabase/client";


export default async function ChamberPage({ params }) {


    const { id } = await params;



    const chamberResult = await supabase

    .from("chambers")

    .select("*")

    .eq("id", id)

    .single();



    if(chamberResult.error || !chamberResult.data){

        return (

            <main className="
            min-h-screen
            bg-black
            text-white
            flex
            items-center
            justify-center
            ">

            Chamber Not Found

            </main>

        );

    }



    const chamber =
    chamberResult.data;



    const postsResult = await supabase

    .from("chamber_posts")

    .select("*")

    .eq("chamber_id", id)

    .order("created_at", {
        ascending:false
    });



    const posts =
    postsResult.data || [];



    return (

        <main className="
        min-h-screen
        bg-[#070707]
        text-white
        p-6
        ">


        <section className="
        max-w-xl
        mx-auto
        bg-[#5B0A18]
        border
        border-[#D4AF37]
        rounded-3xl
        p-8
        ">


        <h1 className="
        text-3xl
        text-[#D4AF37]
        font-bold
        ">

        🏛 {chamber.name}

        </h1>



        <p className="
        text-gray-300
        mt-3
        ">

        {chamber.description}

        </p>




        <div className="
        mt-8
        bg-black
        border
        border-[#D4AF37]
        rounded-2xl
        p-5
        ">


        <h2 className="
        text-xl
        text-[#D4AF37]
        font-bold
        mb-5
        ">

        Official Chamber Notices

        </h2>




        {
        posts.map((post)=>(


            <div
            key={post.id}
            className="
            border-b
            border-gray-700
            pb-5
            mb-5
            "
            >


            <h3 className="font-bold">

            {post.title}

            </h3>



            <p className="
            text-gray-300
            mt-3
            ">

            {post.content}

            </p>



            <p className="
            text-[#D4AF37]
            mt-3
            text-sm
            ">

            Issued by:
            {post.issued_by}

            </p>



            </div>


        ))
        }



        </div>



        </section>


        </main>

    );

}
