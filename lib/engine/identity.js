import { getRoyalPass } from "../services/pass.service";


export async function getMemberIdentity(memberId){

    const { data: pass, error } =
    await getRoyalPass(memberId);


    if(error){

        return {

            success:false,

            error

        };

    }


    return {

        success:true,

        pass

    };

}

