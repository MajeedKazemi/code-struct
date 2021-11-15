import { HoverMessage } from "../messages/messages";
import { Statement } from "../syntax-tree/ast";
import { Module } from "../syntax-tree/module";

export class DraftRecord {
    code: Statement;
    warning: HoverMessage;

    private module: Module; //no point in instantiating the editor itself because it will require an instance of Module anyway

    constructor(code: Statement, module: Module, txt?: string) {
        this.code = code;
        this.module = module;
        this.module.messageController.addHoverMessage(code, {}, txt ?? "");
        this.warning = code.message;
        this.code.message = this.warning;
    }

    removeMessage() {
        this.module.messageController.removeMessageFromConstruct(this.code);
    }
}
