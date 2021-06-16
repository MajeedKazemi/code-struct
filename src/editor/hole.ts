import { CallbackType, CodeConstruct, Callback, LiteralValExpr, EditableTextTkn, IdentifierTkn } from "../syntax-tree/ast";
import Editor from "./editor";

export default class Hole {
    static editableHoleClass = "editableHole";

    element: HTMLDivElement;
    editor: Editor;
    code: CodeConstruct;
    container: HTMLElement;
    removed: boolean = false;

    constructor(editor: Editor, code: CodeConstruct) {
        this.editor = editor;
        this.code = code;

        // Dom element
        const element = document.createElement("div");
        element.classList.add("hole");

        this.container = document.querySelector(".lines-content.monaco-editor-background");
        this.container.append(element);

        this.element = element;
        const hole = this;

        if(code instanceof EditableTextTkn || code instanceof IdentifierTkn){
            this.element.classList.add(Hole.editableHoleClass);

            code.subscribe(CallbackType.loseFocus, new Callback(() => {
				this.element.classList.remove(Hole.editableHoleClass);
            }))

            code.subscribe(CallbackType.focus, new Callback(() => {
				this.element.classList.add(Hole.editableHoleClass);
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

            const bbox = editor.computeBoundingBox(code.getSelection());
            if (bbox.width == 0) {
                bbox.x -= 7;
                bbox.width = 14;
            }
            hole.setTransform(bbox);
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
}
