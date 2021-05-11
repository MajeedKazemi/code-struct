import { Selection } from "monaco-editor";
import { CodeConstruct, Module } from "../syntax-tree/ast";
import Editor from "./editor";

export default class Cursor {
    editor: Editor;
    element: HTMLElement;
    code: CodeConstruct;
    container: HTMLElement;

    constructor(editor: Editor) {
        this.editor = editor;

        this.element = document.createElement("div");
        this.element.classList.add("cursor");

        this.container = document.querySelector(".lines-content.monaco-editor-background");
        this.container.append(this.element);

        const cursor = this;

        function loop() {
            const selection = cursor.code != null ? cursor.code.getSelection() : editor.monaco.getSelection();
            let bbox = cursor.editor.computeBoundingBox(selection);

            cursor.setTransform(bbox);
            requestAnimationFrame(loop);
        }

        loop();
    }

    setTransform(transform: { x: number; width: number; y: number; height: number }) {
        this.element.style.top = `${transform.y + 5}px`;
        this.element.style.left = `${transform.x}px`;

        this.element.style.width = `${transform.width}px`;
        this.element.style.height = `${transform.height - 5 * 2}px`;
    }

    setSelection(selection: Selection, code: CodeConstruct = null) {
        const bbox = this.editor.computeBoundingBox(selection);
        this.setTransform(bbox);

        this.code = code;
    }
}
