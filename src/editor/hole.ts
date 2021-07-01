import {
    CallbackType,
    CodeConstruct,
    Callback,
    EditableTextTkn,
    IdentifierTkn,
    TypedEmptyExpr,
    VarAssignmentStmt,
    DataType,
    ForStatement,
    Module,
} from "../syntax-tree/ast";
import { Editor } from "./editor";
import { Context } from "./focus";

export class Hole {
    static editableHoleClass = "editableHole";
    static availableVarHoleClass = "inScopeHole";
    static holes: Hole[] = [];

    element: HTMLDivElement;
    editor: Editor;
    code: CodeConstruct;
    container: HTMLElement;
    removed: boolean = false;

    constructor(editor: Editor, code: CodeConstruct) {
        this.editor = editor;
        this.code = code;

        // DOM elements
        const element = document.createElement("div");
        element.classList.add("hole");

        this.container = document.querySelector(".lines-content.monaco-editor-background");
        this.container.append(element);

        this.element = element;
        const hole = this;

        Hole.holes.push(hole);

        if (code instanceof EditableTextTkn || code instanceof IdentifierTkn) {
            this.element.classList.add(Hole.editableHoleClass);

            if(code instanceof IdentifierTkn && code.getParentStatement() instanceof ForStatement){
                code.subscribe(CallbackType.change, new Callback(() => {
                    (code.getParentStatement() as ForStatement).loopVar.setIdentifier(code.getRenderText());
                })
            )}

            code.subscribe(
                CallbackType.focusEditableHole,
                new Callback(() => {
                    this.element.classList.add(Hole.editableHoleClass);
                })
            );
        }
        else if(code instanceof TypedEmptyExpr){
            code.subscribe(CallbackType.showAvailableVars, new Callback(() => {
                const validIdentifierIds = Module.getValidVariableReferences(code).map(ref => (ref.statement as VarAssignmentStmt).buttonId);
                
                for(const hole of Hole.holes){
                    if((hole.code.rootNode instanceof VarAssignmentStmt || hole.code.rootNode instanceof ForStatement) && validIdentifierIds.indexOf(hole.code.rootNode.buttonId) > -1 && hole.code instanceof IdentifierTkn){
                        hole.element.classList.add(Hole.availableVarHoleClass);
                    }
                }
            }))
        }

        code.subscribe(
            CallbackType.delete,
            new Callback(() => {
                hole.setTransform({ x: 0, y: 0, width: 0, height: 0 });
                hole.remove();
            })
        );

        code.subscribe(
            CallbackType.replace,
            new Callback(() => {
                hole.setTransform({ x: 0, y: 0, width: 0, height: 0 });
                hole.remove();
            })
        );

        code.subscribe(
            CallbackType.fail,
            new Callback(() => {
                hole.element.style.background = `rgba(255, 0, 0, 0.06)`;

                setTimeout(() => {
                    hole.element.style.background = `rgba(255, 0, 0, 0)`;
                }, 1000);
            })
        );

        function loop() {
            if (hole.removed) return;

            const boundingBox = editor.computeBoundingBox(code.getSelection());

            if (boundingBox.width == 0) {
                boundingBox.x -= 7;
                boundingBox.width = 14;
            }

            hole.setTransform(boundingBox);
            requestAnimationFrame(loop);
        }

        loop();
    }

    setTransform(transform: { x: number; width: number; y: number; height: number }) {
        const padding = 0;

        this.element.style.top = `${transform.y + 5}px`;
        this.element.style.left = `${transform.x - padding}px`;

        this.element.style.width = `${transform.width + padding * 2}px`;
        this.element.style.height = `${transform.height - 5 * 2}px`;
    }

    remove() {
        this.element.remove();
        this.removed = true;
    }

    static disableEditableHoleOutlines(){
        Hole.holes.forEach(hole => {
            hole.element.classList.remove(Hole.editableHoleClass)
        })
    }

    static disableVarHighlights(){
        Hole.holes.forEach(hole => {
            hole.element.classList.remove(Hole.availableVarHoleClass)
        })
    }

    static outlineTextEditableHole(context: Context){
        if(context.token && (context.token instanceof IdentifierTkn || context.token instanceof EditableTextTkn)){
            context.token.notify(CallbackType.focusEditableHole);
        }
        else if(context.tokenToRight && (context.tokenToRight instanceof IdentifierTkn || context.tokenToRight instanceof EditableTextTkn)){
            context.tokenToRight.notify(CallbackType.focusEditableHole);
        }
        else if(context.tokenToLeft && (context.tokenToLeft instanceof IdentifierTkn || context.tokenToLeft instanceof EditableTextTkn)){
            context.tokenToLeft.notify(CallbackType.focusEditableHole);
        }
    }

    static highlightValidVarHoles(context: Context){
        if(context.selected && context.token && context.token instanceof TypedEmptyExpr){
            context.token.notify(CallbackType.showAvailableVars);
        }
    }
}
