import { Module } from "../syntax-tree/module";
import { Expression } from "../syntax-tree/ast";
import { HoverNotification } from "../notification-system/notification";

export class DraftRecord {
    code: Expression;
    warning: HoverNotification;

    private module: Module; //no point in instantiating the editor itself because it will require an instance of Module anyway

    constructor(code: Expression, module: Module) {
        this.code = code;
        this.module = module;
        this.module.notificationSystem.addHoverNotification(code, {}, "Draft Mode");
        this.warning = code.notification;
        this.code.notification = this.warning;
    }

    removeNotification() {
        this.module.notificationSystem.removeNotificationFromConstruct(this.code);
    }
}
