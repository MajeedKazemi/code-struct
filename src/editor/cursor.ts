import { Selection } from "monaco-editor";
import { Module } from "../syntax-tree/ast";
import Editor from "./editor";

export default class Cursor {
    editor: Editor;
    element: HTMLElement;

    constructor(editor: Editor) {
        this.editor = editor;

        this.element = document.createElement("div");
        this.element.classList.add('cursor');
        document.body.append(this.element);
    }

     setTransform(transform: { x: number; width: number; y: number; height: number; }) {
        this.element.style.top = `${transform.y}px`;
        this.element.style.left = `${transform.x}px`;

        this.element.style.width = `${transform.width}px`;
        this.element.style.height = `${transform.height}px`;
    }

    setSelection(selection: Selection) {
        const bbox = this.editor.computeBoundingBox(selection);
        this.setTransform(bbox);
    }
}