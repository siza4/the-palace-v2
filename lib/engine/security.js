import { getCurrentMember }
from "../services/session.service";



export async function verifyPalaceEntry(){

    const result =
    await getCurrentMember();



    if(!result.member){

        return {

            allowed:false

        };

    }



    return {

        allowed:true,

        member:result.member

    };

}
