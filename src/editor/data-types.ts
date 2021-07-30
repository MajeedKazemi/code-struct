import { EditActionType, InsertActionType } from "./consts";

export class EditAction {
    type: EditActionType;
    data: any;

    constructor(type: EditActionType, data?: any) {
        this.type = type;
        this.data = data;
    }
}

export class InsertActionData {
    cssId: string;
    action: InsertActionType;
    data: any;

    constructor(cssId: string, type: InsertActionType, data: any = {}) {
        this.cssId = cssId;
        this.action = type;
        this.data = data;
    }
}
