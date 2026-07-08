import {
    getMemberById,
    getMemberByRoyalId,
} from "../services/member.service";


import {
    getRoyalPass,
} from "../services/pass.service";


export async function enterPalace(identifier) {


    let memberResult;


    if(identifier.startsWith("PLC-")){

        memberResult =
        await getMemberByRoyalId(identifier);

    } else {

        memberResult =
        await getMemberById(identifier);

    }



    if(memberResult.error || !memberResult.data){

        return {

            success:false,

            message:"Royal Identity not found"

        };

    }



    const member =
    memberResult.data;



    if(member.status === "Suspended"){

        return {

            success:false,

            message:"Palace access suspended"

        };

    }



    const passResult =
    await getRoyalPass(member.id);



    console.log(
        "PASS DEBUG:",
        JSON.stringify(passResult)
    );



    if(passResult.error){

        return {

            success:false,

            message:"Unable to verify Royal Pass. Please try again."

        };

    }



    const pass =
    passResult.data;



    if(!pass){

        return {

            success:false,

            message:"No Royal Pass found for this identity"

        };

    }



    if(!pass.active){

        return {

            success:false,

            message:"Royal Pass inactive"

        };

    }



    return {

        success:true,

        member,

        pass

    };

}
