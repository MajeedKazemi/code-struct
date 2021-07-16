export class Callback {
    static counter: number = 0;
    callback: () => any;
    callerId: string;

    constructor(callback: () => any) {
        this.callback = callback;
        this.callerId = "caller-id-" + Callback.counter;
        Callback.counter++;
    }
}

export enum CallbackType1 {
    change,
    replace,
    delete,
    fail,
    focusEditableHole,
    showAvailableVars,
}
