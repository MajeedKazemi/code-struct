import axios, { AxiosPromise } from "axios";
import { LogEvent } from "./analytics";

const baseUrl = "https://nova.majeed.cc/api";

export function sendEventsBatch(events: Array<LogEvent>): AxiosPromise {
    return axios({
        method: "post",
        url: `${baseUrl}/events/batch`,
        data: {
            events,
        },
    });
}
