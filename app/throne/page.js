"use client";

import { useEffect, useState } from "react";
import { loadThrone } from "../../lib/engine/throne";


export default function ThronePage(){

const [data,setData]=useState(null);



useEffect(()=>{

    async function load(){

        const result =
        await loadThrone(
            "MEMBER_ID_HERE"
        );

        setData(result);

    }


    load();

},[]);



if(!data){

return (

<div>
Loading The Throne...
</div>

);

}



return (

<main>

<h1>
The Throne
</h1>


<h2>
{data.profile?.display_name}
</h2>


<p>
{data.profile?.royal_title}
</p>


</main>

);


}
