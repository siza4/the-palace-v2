import {
    getAnnouncements
} from "../services/announcement.service";


export async function loadRoyalAnnouncements(){


    const result =
    await getAnnouncements();


    if(result.error){

        return [];

    }


    return result.data || [];


}
