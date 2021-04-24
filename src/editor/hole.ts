import { CallbackType, CodeConstruct } from "../syntax-tree/ast";
import Editor from "./editor";

export default class Hole {
    element: HTMLDivElement;
    editor: Editor;
    code: CodeConstruct;
    interval: number;

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
            hole.setTransform({x: 0, y: 0, width: 0, height: 0});
            hole.element.remove();

            clearInterval(this.interval);
        });
        
        code.subscribe(CallbackType.replace, () => {
            hole.setTransform({x: 0, y: 0, width: 0, height: 0});

            clearInterval(this.interval);
        });

        code.subscribe(CallbackType.fail, () => {
            hole.element.style.background = `rgba(255, 0, 0, 0.06)`;
            setTimeout(() => {
                hole.element.style.background = `rgba(255, 0, 0, 0)`;
            }, 1000);
        });

        const bbox = editor.computeBoundingBox(code.getSelection());
        if (bbox.width == 0) {
            bbox.x -= 4;
            bbox.width = 8;
        }
        hole.setTransform(bbox);

        function loop() {
            const bbox = editor.computeBoundingBox(code.getSelection());
            if (bbox.width == 0) {
                bbox.x -= 4;
                bbox.width = 8;
            }
            hole.setTransform(bbox);
            requestAnimationFrame(loop);
        }

        loop();

        this.interval = setInterval(() => {
            
        }, 1000);
    }

    setTransform(transform: { x: number; width: number; y: number; height: number; }) {
        const padding = 0;
    
        this.element.style.top = `${transform.y - padding}px`;
        this.element.style.left = `${transform.x - padding}px`;

        this.element.style.width = `${transform.width + padding * 2}px`;
        this.element.style.height = `${transform.height + padding * 2}px`;
    }
}