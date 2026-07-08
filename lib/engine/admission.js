import { createMember } from "../services/member.service";
import { createRoyalPass } from "../services/pass.service";
import { sendNotification } from "./notifications";
import { logActivity } from "./activity";
import { initializeProfile } from "./profile";


function generateRoyalId(){

    const year = new Date().getFullYear();

    const random =
    Math.floor(100000 + Math.random() * 900000);

    return `PLC-${year}-${random}`;

}



export async function requestAdmission(form){


    const royalId = generateRoyalId();



    // Create Member

    const { data: member, error } =
    await createMember({

        royal_id: royalId,

        full_name: form.full_name,

        email: form.email,

        phone: form.phone,

        country: form.country,

        membership_level: "Citizen",

        status: "Pending"

    });



    if(error){

        return {

            success:false,

            error

        };

    }



    // Create Member Profile

    const { error: profileError } =
    await initializeProfile(member);



    if(profileError){

        return {

            success:false,

            error: profileError

        };

    }



    // Create Royal Pass

    const { error: passError } =
    await createRoyalPass({

        memberId: member.id,

        royalId: royalId

    });



    if(passError){

        return {

            success:false,

            error: passError

        };

    }



    // Welcome Notification

    await sendNotification({

        memberId: member.id,

        title: "Welcome to The Palace",

        message:
        "Your Royal Identity has been successfully created.",

        type:"system"

    });



    // Activity Log

    await logActivity({

        memberId: member.id,

        action:"MEMBER_CREATED",

        description:
        "Royal admission completed successfully.",

        metadata: {

            royal_id: royalId

        }

    });



    return {

        success:true,

        member

    };


}
