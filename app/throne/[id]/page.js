"use client";


import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase/client";


export default function ThronePage({ params }) {


    const [member, setMember] = useState(null);
    const [loading, setLoading] = useState(true);
    const [memberId, setMemberId] = useState(null);



    useEffect(() => {


        async function loadParams(){

            const resolvedParams = await params;

            setMemberId(resolvedParams.id);

        }


        loadParams();


    }, [params]);





    useEffect(() => {


        if(!memberId) return;



        async function loadMember(){


            const result = await supabase

                .from("members")

                .select("*")

                .eq("id", memberId)

                .single();



            console.log("THRONE MEMBER RESULT:", result);



            if(result.data){

                setMember(result.data);

            }


            setLoading(false);


        }



        loadMember();


    }, [memberId]);






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

                Loading Royal Identity...

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

                <h1>
                    Royal Identity Not Found
                </h1>

            </main>

        );

    }





    return (

        <main className="
        min-h-screen
        bg-[#070707]
        p-6
        text-white
        ">


            <section className="
            max-w-xl
            mx-auto
            bg-[#5B0A18]
            border
            border-[#D4AF37]
            rounded-2xl
            p-8
            ">


                <h1 className="
                text-3xl
                text-[#D4AF37]
                font-bold
                text-center
                ">

                    THE ROYAL THRONE

                </h1>



                <div className="
                mt-8
                bg-black
                rounded-xl
                p-5
                border
                border-[#D4AF37]
                ">


                    <h2 className="
                    text-[#D4AF37]
                    text-xl
                    ">

                    Royal Identity

                    </h2>


                    <p className="mt-3">
                    Name: {member.full_name}
                    </p>


                    <p>
                    Royal ID: {member.royal_id}
                    </p>


                    <p>
                    Status: {member.status}
                    </p>


                </div>


            </section>


        </main>

    );

}
