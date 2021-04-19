import { CallbackType, CodeConstruct } from "../syntax-tree/ast";
import Editor from "./editor";

export default class Hole {
    element: HTMLDivElement;
    editor: Editor;
    code: CodeConstruct;

    constructor(editor: Editor, code: CodeConstruct) {
        this.editor = editor;
        this.code = code;

        // Add monaco padding

        // Dom element
        const element = document.createElement("div");
        element.classList.add('hole');
        document.body.append(element);
        this.element = element;

        const hole = this;
        
        code.subscribe(CallbackType.change, () => {
            const bbox = editor.computeBoundingBox(code.getSelection());
            if (bbox.width == 0) {
                bbox.x -= 4;
                bbox.width = 8;
            }
            hole.setTransform(bbox);
        });

        code.subscribe(CallbackType.delete, () => {
            console.log("Deleted");
            hole.setTransform({x: 0, y: 0, width: 0, height: 0});
        });
        
        code.subscribe(CallbackType.replace, () => {
            console.log("Replaced");
            hole.setTransform({x: 0, y: 0, width: 0, height: 0});
        });

        const bbox = editor.computeBoundingBox(code.getSelection());
        if (bbox.width == 0) {
            bbox.x -= 4;
            bbox.width = 8;
        }
        hole.setTransform(bbox);

        console.log(code);
    }

    setTransform(transform: { x: number; width: number; y: number; height: number; }) {
        this.element.style.top = `${transform.y}px`;
        this.element.style.left = `${transform.x}px`;

        this.element.style.width = `${transform.width}px`;
        this.element.style.height = `${transform.height}px`;
    }
}