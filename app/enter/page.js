"use client";


import { useState } from "react";
import { enterPalace } from "../../lib/engine/entry";



export default function EnterPage(){


    const [identifier,setIdentifier] = useState("");

    const [message,setMessage] = useState("");

    const [loading,setLoading] = useState(false);



    async function handleEnter(){


        setLoading(true);

        setMessage("Verifying Royal Identity...");



        const result =
        await enterPalace(identifier);



        if(!result.success){


            setMessage(result.message);

            setLoading(false);

            return;

        }



        setMessage("Access Granted");



        window.location.href =
        `/throne/${result.member.id}`;


    }




    return (

        <main className="
        min-h-screen
        bg-[#070707]
        flex
        items-center
        justify-center
        p-6
        ">


            <section className="
            w-full
            max-w-md
            bg-[#5B0A18]
            border
            border-[#D4AF37]
            rounded-2xl
            p-8
            shadow-xl
            ">


                <h1 className="
                text-3xl
                text-center
                text-[#D4AF37]
                font-bold
                mb-3
                ">

                    THE PALACE

                </h1>



                <p className="
                text-center
                text-[#C0C0C0]
                mb-8
                ">

                    Private Royal Entrance

                </p>




                <input

                value={identifier}

                onChange={(e)=>setIdentifier(e.target.value)}

                placeholder="Enter Royal ID"

                className="
                w-full
                bg-black
                text-white
                border
                border-[#D4AF37]
                rounded
                p-3
                "

                />




                <button

                onClick={handleEnter}

                disabled={loading}

                className="
                w-full
                mt-5
                bg-[#D4AF37]
                text-black
                font-bold
                py-3
                rounded
                "

                >

                    {loading 
                    ? "VERIFYING..."
                    : "ENTER PALACE"}

                </button>




                <p className="
                text-center
                text-[#C0C0C0]
                mt-5
                ">

                    {message}

                </p>


            </section>


        </main>

    );

}
