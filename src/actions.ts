import { Module } from "./syntax-tree/ast";

enum ActionType {
    OnKeyDown,
    OnMouseDown,
    OnButtonDown,
}

export class Action {
    type: ActionType;
    event: any;

    constructor(type: ActionType, event: any) {
        this.type = type;
        this.event = event;
    }
}

export default class ActionStack {
    stack = [];
    module: Module;

    constructor(module: Module) {
        this.module = module;

        this.attachOnMouseDownListener();
        this.attachOnKeyDownListener();
        this.attachOnButtonPress();
    }

    undo() {
        // Undo the 'ctrl' press after 'ctrl + z'
        this.stack.pop();

        // Undo the most recent action
        this.stack.pop();

        this.module.reset();

        // TODO: find why this needs a timeout, I think its because
        // monaco's selection doesn't update synchronously after this.module.reset()
        // If there is a callback on monaco like onUpdateComplete then subscribe to that
        // and execute this then
        setTimeout(() => {
            for (const action of this.stack) {
                this.apply(action);
            }
        });
    }

    attachOnButtonPress() {
        const buttons: Array<HTMLElement> = Array(...(document.querySelectorAll("#editor-toolbox .button") as any));

        // TODO: Dynamic buttons create by variable assignment
        for (const button of buttons) {
            button.addEventListener("click", () => {
                const action = new Action(ActionType.OnButtonDown, button.id);
                this.stack.push(action);
                this.apply(action);
            });
        }
    }

    attachOnMouseDownListener() {
        const module = this.module;

        module.editor.monaco.onMouseDown((e) => {
            const action = new Action(ActionType.OnMouseDown, e);
            this.stack.push(action);
            this.apply(action);
        });
    }

    attachOnKeyDownListener() {
        const module = this.module;

        module.editor.monaco.onKeyDown((e) => {
            if (e.ctrlKey && e.code == "KeyZ") {
                this.undo();
                return;
            }

            const action = new Action(ActionType.OnKeyDown, e);
            this.stack.push(action);
            this.apply(action);
        });
    }

    apply(action) {
        switch (action.type) {
            case ActionType.OnKeyDown:
                this.module.eventHandler.onKeyDown(action.event);
                break;
            case ActionType.OnButtonDown:
                this.module.eventHandler.onButtonDown(action.event);
                break;
            case ActionType.OnMouseDown:
                this.module.eventHandler.onMouseDown(action.event);
                break;
            default:
                break;
        }
    }
}
