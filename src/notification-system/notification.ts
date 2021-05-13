import * as monaco from 'monaco-editor';
import Editor from '../editor/editor';

//TODO: Might want to change this to be constructor parameters so that boxes of various sizes can be created anywhere
//TODO: Most likely will have to size based on text size inside. Not all messages will be the same length.
const hoverNotificationMaxWidth = 200;
const hoverNotificationMaxHeight = 25;
const notificationParentElement = ".lines-content.monaco-editor-background";

//TODO: Add documentation for everything in here

/**
 * 
 */
interface NotificationBox{
    notificationBox: HTMLDivElement;

    addNotificationBox();
    setNotificationBoxBounds();
    setNotificationBehaviour();
    moveWithinEditor();
}

/**
 * 
 */
export abstract class Notification{
    message: string;
    editor: Editor;
    selection: monaco.Selection;
    index: number;
    parentElement: HTMLDivElement;
    notificationTextDiv: HTMLDivElement;
    domId: string;
    notificationDomIdPrefix: string;

    static currDomId: number = 0;

    constructor(editor: Editor, selection: monaco.Selection, index: number = -1){
        this.selection = selection;
        this.editor = editor;
        this.index = index;

        this.parentElement = document.createElement("div");
    }

    addHighlight(styleClass: string){
        this.parentElement.classList.add(styleClass);
        this.setHighlightBounds();
    }

    setHighlightBounds(){
        const transform = this.editor.computeBoundingBox(this.selection);

        this.parentElement.style.top = `${transform.y + 5}px`;
        this.parentElement.style.left = `${transform.x - 0}px`;

        this.parentElement.style.width = `${transform.width + 0 * 2}px`;
        this.parentElement.style.height = `${transform.height - 5 * 2}px`;
    }

    removeNotificationFromDOM(){
        const parent = document.querySelector(notificationParentElement);
        parent.removeChild(document.getElementById(this.domId));
    }

    setDomId(){
        Notification.currDomId++;

        this.domId = `${this.notificationDomIdPrefix}-${Notification.currDomId}`;
        this.parentElement.setAttribute("id", this.domId)
    }
}

/**
 * Notification that allows user to hover over a selection to see more information.
 */
export class HoverNotification extends Notification implements NotificationBox{
    static notificationFadeDelay = 500; //ms

    notificationBox = null;
    showNotificationBox  = false;

    constructor(editor: Editor, selection: monaco.Selection, index: number = -1){
        super(editor, selection, index);

        this.notificationDomIdPrefix = "hoverNotification";
        this.addHighlight("hoverNotificationHighlight");
        this.setDomId();

        //hover box
        this.addNotificationBox();

        //TODO: text
        

        document.querySelector(notificationParentElement).appendChild(this.parentElement);
    }

    addNotificationBox(){
        this.notificationBox = document.createElement("div");
        this.notificationBox.classList.add("hoverNotificationHover");
        this.notificationBox.style.visibility = "hidden";

        this.setNotificationBoxBounds();
        this.setNotificationBehaviour();
        this.moveWithinEditor();

        this.parentElement.appendChild(this.notificationBox);
    }

    setNotificationBoxBounds(){
        this.notificationBox.style.top = `${-hoverNotificationMaxHeight}px`;
        this.notificationBox.style.left = `${(-hoverNotificationMaxWidth / 2)}px`;

        this.notificationBox.style.width = `${hoverNotificationMaxWidth}px`;
        this.notificationBox.style.height = `${hoverNotificationMaxHeight}px`;
    }

    setNotificationBehaviour(){
        this.parentElement.addEventListener("mouseenter", (e) => {
            this.notificationBox.style.visibility = "visible";
        })

        this.notificationBox.addEventListener("mouseenter", (e) => {
            this.showNotificationBox = true;
        })

        this.notificationBox.addEventListener("mouseleave", (e) => {
            this.showNotificationBox = false;
            this.notificationBox.style.visibility = "hidden";
        })

        this.parentElement.addEventListener("mouseleave", (e) => {
            setTimeout(() => {
                if(!this.showNotificationBox){
                    this.notificationBox.style.visibility = "hidden";
                }
            }, HoverNotification.notificationFadeDelay)
        })
    }

    moveWithinEditor(){
        //This was changed to use relative position, so these checks won't work anymore since they were 
        //for absolute position
        if(parseInt(this.notificationBox.style.left) < 0){
            this.notificationBox.style.left = `${parseInt(this.parentElement.style.left) + parseInt(this.notificationBox.style.left)}px`;
        }
        if(parseInt(this.notificationBox.style.top) < 0){
            this.notificationBox.style.top = `${this.editor.computeCharHeight()}px`;
        }
    }
}

/**
 * Notification that stays on the screen for a given period of time and then disappears.
 */
export class PopUpNotification extends Notification implements NotificationBox{
    notificationBox = null;

    constructor(editor: Editor, selection: monaco.Selection, index: number = -1){
        super(editor, selection, index);

        this.notificationDomIdPrefix = "popUpNotification";
        this.setDomId();
        this.addHighlight("popUpNotification");

        this.addNotificationBox();

        document.querySelector(notificationParentElement).appendChild(this.parentElement);
    }  

    addNotificationBox(){
        this.notificationBox = document.createElement("div");
        this.notificationBox.classList.add("popUpNotification");

        //this.setNotificationBoxBounds();
        //this.setNotificationBehaviour();
        //this.moveWithinEditor();

        this.parentElement.appendChild(this.notificationBox);
    }

    setNotificationBoxBounds(){
        throw new Error("NOT IMPLEMENTED...")
    }

    setNotificationBehaviour(){
        throw new Error("NOT IMPLEMENTED...")
    }

    moveWithinEditor(){
        throw new Error("NOT IMPLEMENTED...")
    }
}