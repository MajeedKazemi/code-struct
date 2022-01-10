import { sendEventsBatch } from "./requests";
import { getUser } from "./user";

export enum LogType {
    DraftHelpUsed = "draft-help-used", // data: { type: "add-double-quotes"}
    InsertCode = "insert-code", // data: source: "keyboard" | "autocomplete" | "autocomplete-menu" | "draft-mode" | "defined-vars"
    UseCaseSlideUsage = "use-case-slide-usage",
    OpenUseCase = "open-use-case",
    TooltipHoverDuration = "tooltip-hover-duration",
    RunMainCode = "run-main-code",
}

export class LogEvent {
    type: string;
    user: string;
    data: any;

    constructor(type: string, data: any) {
        this.data = data;
        this.type = type;
        this.user = getUser();
    }
}

export class Logger {
    private interval: number;
    private maxSize: number;
    private queue: Array<LogEvent> = [];
    private static instance: Logger;

    constructor(interval: number = 3000, maxSize: number = 3) {
        this.maxSize = maxSize;
        this.interval = interval;
        this.dispatchEvents = this.dispatchEvents.bind(this);

        setInterval(this.dispatchEvents, interval);
    }

    static Instance() {
        if (!Logger.instance) Logger.instance = new Logger();

        return Logger.instance;
    }

    queueEvent(event: LogEvent) {
        console.log(event);
        this.queue.push(event);

        if (this.queue.length >= this.maxSize) this.dispatchEvents();
    }

    dispatchEvents() {
        if (this.queue.length === 0) return;

        sendEventsBatch(this.queue)
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
