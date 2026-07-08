import {
    getMemberChambers
} from "../services/chamber.service";



export async function loadMemberChambers(memberId){


    const result =
    await getMemberChambers(memberId);



    if(result.error){

        console.log(
            "Chamber Error:",
            result.error
        );

        return [];

    }


    return result.data || [];


}
