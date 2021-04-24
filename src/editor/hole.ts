import { CallbackType, CodeConstruct, Callback } from '../syntax-tree/ast';
import Editor from './editor';

export default class Hole {
	element: HTMLDivElement;
	editor: Editor;
	code: CodeConstruct;

	constructor(editor: Editor, code: CodeConstruct) {
		this.editor = editor;
		this.code = code;

		// Add monaco padding

		// Dom element
		const element = document.createElement('div');
		element.classList.add('hole');
		document.body.append(element);
		this.element = element;

		const hole = this;

        code.subscribe(CallbackType.delete, new Callback(() => {
            hole.setTransform({x: 0, y: 0, width: 0, height: 0});
            hole.element.remove();
        }));
        
        code.subscribe(CallbackType.replace, new Callback(() => {
            hole.setTransform({x: 0, y: 0, width: 0, height: 0});
			hole.element.remove();
        }));

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
    }

	setTransform(transform: { x: number; width: number; y: number; height: number }) {
		const padding = 0;

		this.element.style.top = `${transform.y - padding}px`;
		this.element.style.left = `${transform.x - padding}px`;

		this.element.style.width = `${transform.width + padding * 2}px`;
		this.element.style.height = `${transform.height + padding * 2}px`;
	}
}
