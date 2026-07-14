/**
 * @deprecated Confirmed unreachable — nothing anywhere in the app
 * imports loadThrone(). This file's only import (throne.service.js's
 * getThroneData) is itself unreachable for the same reason. The live
 * Throne data path is app/api/throne/route.js -> lib/engine/entry.js.
 * Kept per audit decision (2026-07) until the first stable Palace
 * release; scheduled for removal after that in a dedicated cleanup
 * commit, not before.
 */
import { getThroneData } from "../services/throne.service";


export async function loadThrone(memberId){

    const data =
    await getThroneData(memberId);


    return {

        ...data,

        ready:true

    };

}
