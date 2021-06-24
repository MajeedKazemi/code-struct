import {
    CallbackType,
    CodeConstruct,
    Callback,
    EditableTextTkn,
    IdentifierTkn,
    TypedEmptyExpr,
    VarAssignmentStmt,
    DataType,
} from "../syntax-tree/ast";
import { Editor } from "./editor";
import { Context } from "./focus";

export class Hole {
    static editableHoleClass = "editableHole";
    static inScopeHole = "inScopeHole";
    static holes = [];

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

            code.subscribe(
                CallbackType.loseFocus,
                new Callback(() => {
                    this.element.classList.remove(Hole.editableHoleClass);

                    if (code instanceof IdentifierTkn) {
                        Hole.holes.forEach((hole) => {
                            if (hole.element.classList.contains(Hole.inScopeHole)) {
                                hole.element.classList.remove(Hole.inScopeHole);
                            }
                        });
                    }
                })
            );

            code.subscribe(
                CallbackType.focus,
                new Callback(() => {
                    this.element.classList.add(Hole.editableHoleClass);

                    if (code instanceof IdentifierTkn) {
                        Hole.holes.forEach((hole) => {
                            if (
                                hole.code instanceof TypedEmptyExpr &&
                                ((code.getParentStatement() as VarAssignmentStmt).dataType ==
                                    (hole.code as TypedEmptyExpr).type ||
                                    (hole.code as TypedEmptyExpr).type == DataType.Any) &&
                                hole.code.getParentStatement().hasScope() &&
                                hole.code
                                    .getParentStatement()
                                    .scope.isValidReference(
                                        (code.getParentStatement() as VarAssignmentStmt).buttonId,
                                        hole.code.getSelection().startLineNumber
                                    )
                            ) {
                                hole.element.classList.add(Hole.inScopeHole);
                            }
                        });
                    }
                })
            );
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

    static disableEditableHoleHighlights(){
        Hole.holes.forEach(hole => {
            hole.element.classList.remove(Hole.editableHoleClass)
        })
    }

    static outlineTextEditableHole(context: Context){
        console.log(context)
        if(context.token && (context.token instanceof IdentifierTkn || context.token instanceof EditableTextTkn)){
            context.token.notify(CallbackType.focus);
        }
        else if(context.tokenToRight && (context.tokenToRight instanceof IdentifierTkn || context.tokenToRight instanceof EditableTextTkn)){
            context.tokenToRight.notify(CallbackType.focus);
        }
        else if(context.tokenToLeft && (context.tokenToLeft instanceof IdentifierTkn || context.tokenToLeft instanceof EditableTextTkn)){
            context.tokenToLeft.notify(CallbackType.focus);
        }
    }
}
