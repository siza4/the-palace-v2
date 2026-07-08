import { getThroneData } from "../services/throne.service";


export async function loadThrone(memberId){

    const data =
    await getThroneData(memberId);


    return {

        ...data,

        ready:true

    };

}
