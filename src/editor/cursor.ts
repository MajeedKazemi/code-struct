import { CodeConstruct, EmptyLineStmt, TypedEmptyExpr } from "../syntax-tree/ast";
import { Editor } from "./editor";

export class Cursor {
    editor: Editor;
    element: HTMLElement;
    code: CodeConstruct;
    container: HTMLElement;

    constructor(editor: Editor) {
        this.editor = editor;
        this.element = document.createElement("div");
        this.element.classList.add("custom-selection-cursor");
        this.container = document.querySelector(".lines-content.monaco-editor-background");
        this.container.append(this.element);

        const cursor = this;

        function loop() {
            cursor.setTransform(cursor.code);

            requestAnimationFrame(loop);
        }

        loop();
    }

    setTransform(code: CodeConstruct) {
        let leftPadding = 0;
        let rightPadding = 0;

        const selection = code != null ? code.getSelection() : this.editor.monaco.getSelection();

        if (code instanceof TypedEmptyExpr) this.element.style.borderRadius = "15px";
        else this.element.style.borderRadius = "0";

        this.element.style.visibility = "visible";
        if (!code || code instanceof EmptyLineStmt) this.element.style.visibility = "hidden";

        const transform = this.editor.computeBoundingBox(selection);

        this.element.style.top = `${transform.y + 5}px`;
        this.element.style.left = `${transform.x - leftPadding}px`;

        this.element.style.width = `${transform.width + rightPadding}px`;
        this.element.style.height = `${transform.height - 5 * 2}px`;
    }

    setSelection(code: CodeConstruct = null) {
        this.code = code;
        this.setTransform(code);
    }
}
