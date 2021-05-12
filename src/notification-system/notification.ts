import * as monaco from 'monaco-editor';
import Editor from '../editor/editor';

const hoverNotificationMaxWidth = 200;
const hoverNotificationMaxHeight = 25;

export abstract class Notification{
    message: string;
    editor: Editor;
    selection: monaco.Selection;
    index: number;
    htmlParentElement: HTMLDivElement;
    htmlTextElement: HTMLDivElement;
    domId: string;
    notificationDomIdPrefix: string;

    static currDomId: number = 0;

    constructor(editor: Editor, selection: monaco.Selection, index: number = -1){
        this.selection = selection;
        this.editor = editor;
        this.index = index;

        this.htmlParentElement = document.createElement("div");
    }

    addHighlight(styleClass: string){
        this.htmlParentElement.classList.add(styleClass);
        this.setHighlightBounds();
    }

    setHighlightBounds(){
        const transform = this.editor.computeBoundingBox(this.selection);

        this.htmlParentElement.style.top = `${transform.y + 5}px`;
        this.htmlParentElement.style.left = `${transform.x - 0}px`;

        this.htmlParentElement.style.width = `${transform.width + 0 * 2}px`;
        this.htmlParentElement.style.height = `${transform.height - 5 * 2}px`;
    }

    removeHighlight(){
        throw new Error("NOT IMPLEMENTED...");
    }

    setDomId(){
        Notification.currDomId++;

        this.domId = `${this.notificationDomIdPrefix}-${Notification.currDomId}`;
        this.htmlParentElement.setAttribute("id", this.domId)
    }
}

export class HoverNotification extends Notification{
    htmlHoverElement: HTMLDivElement;

    constructor(editor: Editor, selection: monaco.Selection, index: number = -1){
        super(editor, selection, index);

        this.notificationDomIdPrefix = "hoverNotification";
        this.addHighlight("hoverNotificationHighlight");
        this.setDomId();

        //hover box
        this.htmlHoverElement = document.createElement("div");
        this.htmlHoverElement.classList.add("hoverNotificationHover");
        this.htmlHoverElement.style.visibility = "hidden";
        this.setHoverBoxBounds();
        this.setHoverEvent();
        this.htmlParentElement.appendChild(this.htmlHoverElement);

        //TODO: text
        

        document.querySelector(".lines-content.monaco-editor-background").appendChild(this.htmlParentElement);
    }

    private setHoverBoxBounds(){
        this.htmlHoverElement.style.top = `${-hoverNotificationMaxHeight}px`;
        this.htmlHoverElement.style.left = `${(-hoverNotificationMaxWidth / 2)}px`;

        this.htmlHoverElement.style.width = `${hoverNotificationMaxWidth}px`;
        this.htmlHoverElement.style.height = `${hoverNotificationMaxHeight}px`;

        this.moveWithinEditor();
    }

    private setHoverEvent(){
        this.htmlParentElement.addEventListener("mouseenter", (e) => {
            this.htmlHoverElement.style.visibility = "visible";
        })

        this.htmlParentElement.addEventListener("mouseleave", (e) => {
            this.htmlHoverElement.style.visibility = "hidden";
        })
    }

    private moveWithinEditor(){
        if(parseInt(this.htmlHoverElement.style.left) < 0){
            this.htmlHoverElement.style.left = `${parseInt(this.htmlParentElement.style.left) + parseInt(this.htmlHoverElement.style.left)}px`;
        }
        if(parseInt(this.htmlHoverElement.style.top) < 0){
            this.htmlHoverElement.style.top = `${this.editor.computeCharHeight()}px`;
        }
    }
}

export class PopUpNotification extends Notification{
    constructor(editor: Editor, selection: monaco.Selection, index: number = -1){
        super(editor, selection, index);

        this.notificationDomIdPrefix = "popUpNotification";
        this.addHighlight("popUpNotification");

        document.querySelector(".lines-content.monaco-editor-background").appendChild(this.htmlParentElement);

    }  
}