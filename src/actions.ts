import { IfStatement, Module } from "./syntax-tree/ast";

const navigationKeys = ["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"]

enum ActionType {
    OnKeyDown,
    OnMouseDown,
    OnButtonDown,
    OnMouseMove,
    OnDidScrollChange
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
        this.attachOnMouseMoveListener();
        this.attachOnDidScrollChangeListener();
    }

    undo() {
        // Undo the 'ctrl' press after 'ctrl + z'
        if(this.stack[this.stack.length - 1].type === ActionType.OnKeyDown && this.stack[this.stack.length - 1].event.ctrlKey){
            this.stack.pop();
        }

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

            //exclude navigation
            if(navigationKeys.indexOf(e.code) === -1){
                this.stack.push(action);
            }

            this.apply(action);
        });
    }

    attachOnMouseMoveListener(){
        const module = this.module;

        //position of mouse inside of editor (line + column)
        module.editor.monaco.onMouseMove((e) => {
            const action = new Action(ActionType.OnMouseMove, e);
            this.apply(action);
        });

        //x,y pos of mouse within window
        document.onmousemove = function(e){
            module.editor.mousePosWindow[0] = e.x;
            module.editor.mousePosWindow[1] = e.y;
        };
    }

    attachOnDidScrollChangeListener(){
        const module = this.module

        module.editor.monaco.onDidScrollChange((e) => {
            const action = new Action(ActionType.OnDidScrollChange, e);
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
            case ActionType.OnMouseMove:
                this.module.eventHandler.onMouseMove(action.event);
                break;  
            case ActionType.OnDidScrollChange:
                this.module.eventHandler.onDidScrollChange(action.event);
                break;  
            default:
                break;
        }
    }
}
