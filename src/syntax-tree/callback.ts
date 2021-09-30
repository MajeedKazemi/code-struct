import { CodeConstruct } from "./ast";

export class Callback {
    static counter: number = 0;
    callback: (code: CodeConstruct) => void;
    callerId: string;

    constructor(callback: (code: CodeConstruct) => void) {
        this.callback = callback;
        this.callerId = "caller-id-" + Callback.counter;
        Callback.counter++;
    }
}

export enum CallbackType {
    change,
    replace,
    delete,
    fail,
    focusEditableHole,
    showAvailableVars,
    onFocusOff,
}
