import * as monaco from 'monaco-editor';
import Editor from '../editor/editor';

const hoverNotificationMaxWidth = 200;
const hoverNotificationMaxHeight = 25;

abstract class Notification{
    message: string;
    editor: Editor;
    index: number;
    htmlElement: HTMLDivElement;
    htmlTextElement: HTMLDivElement;
}

export class HoverNotification extends Notification{
    htmlHoverElement: HTMLDivElement;
    selection: monaco.Selection;

    constructor(editor: Editor, selection: monaco.Selection){
        super();

        this.selection = selection;
        this.editor = editor;

        //highlight box
        this.htmlElement = document.createElement("div");
        this.htmlElement.classList.add("hoverNotificationHighlight");
        this.setHighlightBounds();

        //hover box
        this.htmlHoverElement = document.createElement("div");
        this.htmlHoverElement.classList.add("hoverNotificationHover");
        this.htmlHoverElement.style.visibility = "hidden";
        this.setHoverBoxBounds();
        this.setHoverEvent();
        this.htmlElement.appendChild(this.htmlHoverElement);

        //TODO: text
        

        document.querySelector(".lines-content.monaco-editor-background").appendChild(this.htmlElement);
    }

    private setHighlightBounds(){
        const transform = this.editor.computeBoundingBox(this.selection);

        this.htmlElement.style.top = `${transform.y + 5}px`;
        this.htmlElement.style.left = `${transform.x - 0}px`;

        this.htmlElement.style.width = `${transform.width + 0 * 2}px`;
        this.htmlElement.style.height = `${transform.height - 5 * 2}px`;
    }

    private setHoverBoxBounds(){
        this.htmlHoverElement.style.top = `${-hoverNotificationMaxHeight}px`;
        this.htmlHoverElement.style.left = `${(-hoverNotificationMaxWidth / 2)}px`;

        this.htmlHoverElement.style.width = `${hoverNotificationMaxWidth}px`;
        this.htmlHoverElement.style.height = `${hoverNotificationMaxHeight}px`;

        this.moveWithinEditor();

    }

    private setHoverEvent(){
        this.htmlElement.addEventListener("mouseenter", (e) => {
            this.htmlHoverElement.style.visibility = "visible";
        })

        this.htmlElement.addEventListener("mouseleave", (e) => {
            this.htmlHoverElement.style.visibility = "hidden";
        })
    }

    private moveWithinEditor(){
        if(parseInt(this.htmlHoverElement.style.left) < 0){
            this.htmlHoverElement.style.left = `${parseInt(this.htmlElement.style.left)+ parseInt(this.htmlHoverElement.style.left)}px`;
        }
        if(parseInt(this.htmlHoverElement.style.top) < 0){
            this.htmlHoverElement.style.top = `${this.editor.computeCharHeight()}px`;
        }
    }
}