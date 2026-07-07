"use client";

import Barcode from "react-barcode";


export default function BarcodePass({
value
}){

return (

<div className="bg-white p-4">

<Barcode
value={value}
width={1.5}
height={60}
/>

</div>

)

}
