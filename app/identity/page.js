"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase/client";
import { generateRoyalId } from "../../lib/palace";

export default function Identity() {

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    country: ""
  });

  const [message, setMessage] = useState("");


  function updateField(e) {

    setForm({
      ...form,
      [e.target.name]: e.target.value
    });

  }



  async function registerMember() {

    setMessage("Creating Royal Identity...");


    if (
      !form.full_name ||
      !form.email ||
      !form.phone ||
      !form.country
    ) {

      setMessage("Complete all fields.");

      return;

    }


    const royalId = generateRoyalId();



    const {
      data: member,
      error: memberError

    } = await supabase

      .from("members")

      .insert({

        royal_id: royalId,

        full_name: form.full_name,

        email: form.email,

        phone: form.phone,

        country: form.country,

        membership_level: "Citizen",

        status: "Pending"

      })

      .select()

      .single();



    if(memberError){

      setMessage(memberError.message);

      return;

    }



    const {
      error: passError

    } = await supabase

      .from("royal_passes")

      .insert({

        member_id: member.id,

        qr_data: royalId,

        barcode_data: royalId,

        active:true

      });



    if(passError){

      setMessage(passError.message);

      return;

    }



    window.location.href =
    `/identity/${member.id}`;


  }



  return (

    <main className="min-h-screen flex items-center justify-center p-6">


      <div className="max-w-md w-full bg-white/5 border border-yellow-500/30 rounded-3xl p-8">


        <h1 className="text-3xl text-center mb-8">
          Royal Admission
        </h1>


        {
          Object.keys(form).map((field)=>(

            <input

              key={field}

              name={field}

              placeholder={field.replace("_"," ").toUpperCase()}

              onChange={updateField}

              className="
              w-full
              mb-4
              p-3
              rounded
              bg-black/30
              border
              border-white/10
              "

            />

          ))
        }


        <button

          onClick={registerMember}

          className="
          w-full
          py-3
          border
          border-yellow-500
          text-yellow-400
          "

        >

          REQUEST ADMISSION

        </button>


        <p className="mt-6 text-center text-yellow-300">

          {message}

        </p>


      </div>


    </main>

  );

}
