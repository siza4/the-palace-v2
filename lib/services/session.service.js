/**
 * @deprecated Confirmed unreachable — nothing anywhere in the app
 * imports getCurrentMember. This file's only caller (lib/engine/
 * security.js's verifyPalaceEntry) is itself unreachable for the same
 * reason. The live session/identity resolution path is
 * lib/auth/verifySession.js, used by every protected API route. Kept
 * per audit decision (2026-07) until the first stable Palace release;
 * scheduled for removal after that in a dedicated cleanup commit, not
 * before.
 */
import { supabase } from "../supabase/client";


export async function getCurrentMember(){

    const {
        data: {
            session
        }
    } = await supabase.auth.getSession();



    if(!session){

        return {

            member:null

        };

    }



    const {

        data:member

    } = await supabase

    .from("members")

    .select("*")

    .eq(
        "email",
        session.user.email
    )

    .single();



    return {

        member

    };

}
