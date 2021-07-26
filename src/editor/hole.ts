import { Editor } from "./editor";
import { Context } from "./focus";
import { Validator } from "./validator";
import { Reference } from "../syntax-tree/scope";
import { Callback, CallbackType } from "../syntax-tree/callback";
import {
    CodeConstruct,
    EditableTextTkn,
    IdentifierTkn,
    TypedEmptyExpr,
    VarAssignmentStmt,
    ForStatement,
} from "../syntax-tree/ast";
import { Module } from "../syntax-tree/module";
import { InsertionType } from "../syntax-tree/consts";

export class Hole {
    static editableHoleClass = "editableHole";
    static validVarIdentifierHole = "validVarIdentifierHole";
    static draftVarIdentifierHole = "draftVarIdentifierHole";
    static holes: Hole[] = [];
    static module: Module;

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
                CallbackType.focusEditableHole,
                new Callback(() => {
                    this.element.classList.add(Hole.editableHoleClass);
                })
            );
        } else if (code instanceof TypedEmptyExpr) {
            code.subscribe(
                CallbackType.showAvailableVars,
                new Callback(() => {
                    const c = Hole.module.focus.getContext();
                    const focusedNode = c.token && c.selected ? c.token : c.lineStatement;

                    const refInsertionTypes = Validator.getValidVariableReferences(
                        focusedNode,
                        Hole.module.variableController
                    );
                    const validIdentifierIds = refInsertionTypes.map(
                        (ref) => ((ref[0] as Reference).statement as VarAssignmentStmt).buttonId
                    );

                    const refInsertionTypeMap = new Map<string, InsertionType>();
                    for (let i = 0; i < validIdentifierIds.length; i++) {
                        refInsertionTypeMap.set(validIdentifierIds[i], refInsertionTypes[i][1]);
                    }

                    for (const hole of Hole.holes) {
                        if (
                            (hole.code.rootNode instanceof VarAssignmentStmt ||
                                hole.code.rootNode instanceof ForStatement) &&
                            hole.code instanceof IdentifierTkn
                        ) {
                            if (refInsertionTypeMap.get(hole.code.rootNode.buttonId) === InsertionType.Valid) {
                                hole.element.classList.add(Hole.validVarIdentifierHole);
                            } else if (
                                refInsertionTypeMap.get(hole.code.rootNode.buttonId) === InsertionType.DraftMode
                            ) {
                                hole.element.classList.add(Hole.draftVarIdentifierHole);
                            }
                        }
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

    static setModule(module: Module) {
        this.module = module;
    }

    static disableEditableHoleOutlines() {
        Hole.holes.forEach((hole) => {
            hole.element.classList.remove(Hole.editableHoleClass);
        });
    }

    static disableVarHighlights() {
        Hole.holes.forEach((hole) => {
            hole.element.classList.remove(Hole.validVarIdentifierHole);
            hole.element.classList.remove(Hole.draftVarIdentifierHole);
        });
    }

    static outlineTextEditableHole(context: Context) {
        if (context.token && (context.token instanceof IdentifierTkn || context.token instanceof EditableTextTkn)) {
            context.token.notify(CallbackType.focusEditableHole);
        } else if (
            context.tokenToRight &&
            (context.tokenToRight instanceof IdentifierTkn || context.tokenToRight instanceof EditableTextTkn)
        ) {
            context.tokenToRight.notify(CallbackType.focusEditableHole);
        } else if (
            context.tokenToLeft &&
            (context.tokenToLeft instanceof IdentifierTkn || context.tokenToLeft instanceof EditableTextTkn)
        ) {
            context.tokenToLeft.notify(CallbackType.focusEditableHole);
        }
    }

    static highlightValidVarHoles(context: Context) {
        if (context.selected && context.token && context.token instanceof TypedEmptyExpr) {
            context.token.notify(CallbackType.showAvailableVars);
        }
    }
}
