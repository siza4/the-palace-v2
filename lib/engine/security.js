/**
 * @deprecated Confirmed unreachable — nothing anywhere in the app
 * imports verifyPalaceEntry. The live authorization-check path is
 * lib/auth/verifySession.js + lib/auth/permissions.js's
 * hasPermission()/hasPermissionAndOffice(). Kept per audit decision
 * (2026-07) until the first stable Palace release; scheduled for
 * removal after that in a dedicated cleanup commit, not before.
 */
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
