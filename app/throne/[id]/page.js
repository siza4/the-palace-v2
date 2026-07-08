"use client";


import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase/client";


export default function ThronePage({ params }) {


    const [member, setMember] = useState(null);
    const [loading, setLoading] = useState(true);



    useEffect(() => {


        async function loadMember(){


            const { id } = await params;



            const result = await supabase

            .from("members")

            .select(`
                id,
                full_name,
                royal_id,
                royal_office,
                membership_status
            `)

            .eq("id", id)

            .single();



            console.log("ROYAL THRONE:", result);



            if(result.data){

                setMember(result.data);

            }


            setLoading(false);


        }



        loadMember();


    }, [params]);





    if(loading){

        return (

            <main className="
            min-h-screen
            bg-black
            flex
            items-center
            justify-center
            text-[#D4AF37]
            ">

            Entering The Palace...

            </main>

        );

    }





    if(!member){

        return (

            <main className="
            min-h-screen
            bg-black
            flex
            items-center
            justify-center
            text-white
            ">

            Royal Identity Not Found

            </main>

        );

    }





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
        ">



        <div className="
        bg-[#5B0A18]
        border
        border-[#D4AF37]
        rounded-3xl
        p-8
        shadow-2xl
        ">



        <h1 className="
        text-center
        text-3xl
        text-[#D4AF37]
        font-bold
        ">

        👑 THE PALACE

        </h1>



        <p className="
        text-center
        text-gray-300
        mt-2
        ">

        Royal Throne

        </p>





        <div className="
        mt-8
        bg-black
        rounded-2xl
        p-6
        border
        border-[#D4AF37]
        ">



        <p className="text-gray-400">
        Welcome Back
        </p>


        <h2 className="
        text-2xl
        mt-2
        ">

        {member.full_name}

        </h2>



        <div className="mt-6 space-y-4">


        <div>
        <p className="text-gray-400">
        Royal Identity
        </p>

        <p className="text-[#D4AF37]">
        {member.royal_id}
        </p>
        </div>




        <div>
        <p className="text-gray-400">
        Royal Office
        </p>

        <p>
        👑 {member.royal_office}
        </p>
        </div>





        <div>
        <p className="text-gray-400">
        Membership Status
        </p>

        <p className="
        text-green-400
        ">

        ● {member.membership_status}

        </p>
        </div>



        </div>


        </div>



        <div className="
        mt-6
        space-y-3
        ">


        <button className="
        w-full
        bg-black
        border
        border-[#D4AF37]
        rounded-xl
        p-4
        text-left
        ">

        📜 Royal Announcements

        </button>



        <button className="
        w-full
        bg-black
        border
        border-[#D4AF37]
        rounded-xl
        p-4
        text-left
        ">

        🏛 Royal Chambers

        </button>




        <button className="
        w-full
        bg-black
        border
        border-[#D4AF37]
        rounded-xl
        p-4
        text-left
        ">

        🎖 Royal Identity

        </button>


        </div>



        </div>


        </section>


        </main>

    );


}
