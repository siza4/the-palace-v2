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
