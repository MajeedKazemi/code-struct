import { sendEventsBatch } from "./requests";
import { getUser } from "./user";

export const ANALYTICS_ENABLED = false;

export enum LogType {
    DraftHelpUsed = "draft-help-used", // data: { type: "add-double-quotes"}
    InsertCode = "insert-code", // data: source: "keyboard" | "autocomplete" | "autocomplete-menu" | "draft-mode" | "defined-vars"
    UseCaseSlideUsage = "use-case-slide-usage",
    TooltipItemUsage = "tooltip-item-usage", // {type: "use-case" | "hint" | "executable", duration}
    TooltipHoverDuration = "tooltip-hover-duration",
    RunMainCode = "run-main-code",
}

export class LogEvent {
    type: string;
    data: any;

    constructor(type: string, data: any) {
        this.data = data;
        this.type = type;
    }
}

export class Logger {
    private interval: number;
    private maxSize: number;
    private queue: Array<LogEvent> = [];
    private static instance: Logger;

    constructor(interval: number = 10000, maxSize: number = 25) {
        this.maxSize = maxSize;
        this.interval = interval;
        this.dispatchEvents = this.dispatchEvents.bind(this);

        if (ANALYTICS_ENABLED) setInterval(this.dispatchEvents, interval);
    }

    static Instance() {
        if (!Logger.instance) Logger.instance = new Logger();

        return Logger.instance;
    }

    queueEvent(event: LogEvent) {
        if (ANALYTICS_ENABLED) {
            console.log(event);
            this.queue.push(event);

            if (this.queue.length >= this.maxSize) this.dispatchEvents();
        }
    }

    dispatchEvents() {
        if (this.queue.length === 0 || !ANALYTICS_ENABLED) return;

        sendEventsBatch(this.queue, getUser(), "nova-editor")
            .then(() => {
                console.log(`batch of ${this.queue.length} events sent successfully`);

                this.queue = [];
            })
            .catch(() => {
                console.error(
                    `failed to send batch of ${this.queue.length} events. will retry ${this.interval}ms later`
                );
            });
    }
}
