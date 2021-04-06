import { CodeConstruct } from "../syntax-tree/ast";
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

        // TODO: Remove this, use callbacks instead
        const hole = this;
        function step(t: number) {
            // If code has been replaced
            if (code.rootNode == null) {
                hole.setTransform({x: 0, y: 0, width: 0, height: 0});
                return;
            }

            // If its for a hole then overlay a white background on top
            if (code.getRenderText() == '---') {
                element.style.background = 'white'
            } else {
                element.style.background = 'none'
            }

            // Set the correct transform based on code's selection
            const bbox = hole.editor.computeBoundingBox(code.getSelection());
            hole.setTransform(bbox);

            requestAnimationFrame(step.bind(this));
        }
        requestAnimationFrame(step.bind(this));
    }

    setTransform(transform: { x: number; width: number; y: number; height: number; }) {
        this.element.style.top = `${transform.y}px`;
        this.element.style.left = `${transform.x}px`;

        this.element.style.width = `${transform.width}px`;
        this.element.style.height = `${transform.height}px`;
    }
}