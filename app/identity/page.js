"use client";

import { useState } from "react";


export default function IdentityPage() {

  const [form, setForm] = useState({

    full_name: "",
    email: "",
    phone: "",
    country: ""

  });


  const [message, setMessage] = useState("");



  function handleChange(e){

    setForm({

      ...form,

      [e.target.name]: e.target.value

    });

  }



  async function handleSubmit(e){

    e.preventDefault();


    setMessage("Submitting Royal Admission request...");



    const res = await fetch("/api/admission", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const result = await res.json();



    if(!result.success){

      setMessage(
        result.error || "Admission request failed"
      );

      return;

    }



    setMessage(
      "Request submitted for review. You'll be notified once Authority makes a decision."
    );


  }



  return (

    <main className="
      min-h-screen 
      flex 
      items-center 
      justify-center 
      bg-[#070707]
      p-6
    ">


      <form
      onSubmit={handleSubmit}
      className="
      w-full
      max-w-md
      rounded-2xl
      p-8
      bg-[#5B0A18]
      border
      border-[#D4AF37]
      space-y-5
      "
      >


        <h1 className="
        text-3xl
        text-center
        text-[#D4AF37]
        ">
          THE PALACE
        </h1>


        <p className="
        text-center
        text-[#C0C0C0]
        ">
          Royal Admission
        </p>



        <input
        name="full_name"
        placeholder="Full Name"
        value={form.full_name}
        onChange={handleChange}
        required
        className="
        w-full
        p-3
        rounded
        bg-black
        text-white
        border
        border-[#D4AF37]/50
        "
        />



        <input
        name="email"
        placeholder="Email"
        type="email"
        value={form.email}
        onChange={handleChange}
        required
        className="
        w-full
        p-3
        rounded
        bg-black
        text-white
        border
        border-[#D4AF37]/50
        "
        />



        <input
        name="phone"
        placeholder="Phone"
        value={form.phone}
        onChange={handleChange}
        required
        className="
        w-full
        p-3
        rounded
        bg-black
        text-white
        border
        border-[#D4AF37]/50
        "
        />



        <input
        name="country"
        placeholder="Country"
        value={form.country}
        onChange={handleChange}
        required
        className="
        w-full
        p-3
        rounded
        bg-black
        text-white
        border
        border-[#D4AF37]/50
        "
        />



        <button
        type="submit"
        className="
        w-full
        py-3
        rounded
        bg-[#D4AF37]
        text-black
        font-bold
        "
        >

          Request Admission

        </button>



        <p className="
        text-center
        text-[#C0C0C0]
        text-sm
        ">
          {message}
        </p>


      </form>


    </main>

  );

}
