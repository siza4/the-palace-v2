"use client";

import QRCode from "qrcode";
import { useEffect,useState } from "react";


export default function QRPass({
data
}) {

const [image,setImage] = useState("");


useEffect(()=>{

QRCode.toDataURL(data)
.then(setImage);

},[data]);


return (

<div className="text-center">

{image && (

<img
src={image}
alt="Royal QR Pass"
className="mx-auto w-40"
/>

)}

</div>

)

}
