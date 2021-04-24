import { Selection } from "monaco-editor";
import { CodeConstruct, Module } from "../syntax-tree/ast";
import Editor from "./editor";

export default class Cursor {
    editor: Editor;
    element: HTMLElement;
    code: CodeConstruct;

    constructor(editor: Editor) {
        this.editor = editor;

        this.element = document.createElement("div");
        this.element.classList.add('cursor');
        document.body.append(this.element);

        const cursor = this;

        function loop() {
            const bbox = cursor.editor.computeBoundingBox(editor.monaco.getSelection());
            cursor.setTransform(bbox);
            requestAnimationFrame(loop);
        }

        loop();
    }

     setTransform(transform: { x: number; width: number; y: number; height: number; }) {
        const padding = 0;
    
        this.element.style.top = `${transform.y - padding}px`;
        this.element.style.left = `${transform.x}px`;

        this.element.style.width = `${transform.width}px`;
        this.element.style.height = `${transform.height + padding * 2}px`;
    }

    setSelection(selection: Selection, code: CodeConstruct = null) {
        const bbox = this.editor.computeBoundingBox(selection);
        this.setTransform(bbox);

        this.code = code;
    }
}