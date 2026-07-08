import {
createProfile,
getProfile
}
from "../services/profile.service";



export async function initializeProfile(member){


return await createProfile({

    member_id: member.id,

    display_name: member.full_name,

    royal_title: "Citizen"

});


}



export async function loadProfile(memberId){

return await getProfile(memberId);

}
