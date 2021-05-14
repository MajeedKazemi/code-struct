import * as monaco from 'monaco-editor';
import Editor from '../editor/editor';

//TODO: Might want to change this to be constructor parameters so that boxes of various sizes can be created anywhere
//TODO: Most likely will have to size based on text size inside. Not all messages will be the same length.
const hoverNotificationDefaultWidth = 200;
const hoverNotificationDefaultHeight = 75;
const hoverNotificationMaxHeight = 25;
const notificationDOMParent = ".lines-content.monaco-editor-background";

//funcs that all classes should have access to, maybe move within some common parent later
const getDimensionsFromStyle = (styleString: string) => {
    const trimmedStyle = styleString.replace(/\s/g, "");

    const widthMatch = trimmedStyle.match(/width:-?\d+\.?\d+[^%]/);
    const heightMatch = trimmedStyle.match(/height:-?\d+\.?\d+[^%]/);
    const leftMatch = trimmedStyle.match(/left:-?\d+\.?\d+[^%]/);
    const topMatch = trimmedStyle.match(/top:-?\d+\.?\d+[^%]/);

    return {width: (widthMatch ? parseFloat(widthMatch[0].split(":")[1]) : 0),
            height: (heightMatch ? parseFloat(heightMatch[0].split(":")[1]) : 0),
            left: (leftMatch ? parseFloat(leftMatch[0].split(":")[1]) : 0),
            top: (topMatch ? parseFloat(topMatch[0].split(":")[1]) : 0)
    };
}



//TODO: Add documentation for everything in here

/**
 * 
 */
interface NotificationBox{
    notificationBox: HTMLDivElement;

    addNotificationBox();
    addText();
    setNotificationBoxBounds();
    setNotificationBehaviour();
    moveWithinEditor();
}

/**
 * A Notification element that allows to highlight erroneous code constructs and display a message to the user.
 */
export abstract class Notification{
    messageText: string;
    editor: Editor;

    /**
     * Selection within the editor that caused this notification.
     */
    selection: monaco.Selection;

    /**
     * Index of this notification within the "notifications" list of a NotificationSystemController instance.
     */
    index: number;

    /**
     * The highlight element of the notification.
     */
    parentElement: HTMLDivElement;
    highlightElement: HTMLDivElement;
    notificationTextDiv: HTMLDivElement;
    domId: string;
    notificationDomIdPrefix: string;

    static currDomId: number = 0;

    constructor(editor: Editor, selection: monaco.Selection, index: number = -1){
        this.selection = selection;
        this.editor = editor;
        this.index = index;

        this.parentElement = document.createElement("div");
        this.parentElement.classList.add("notificationParent");
        this.wrapAroundCodeConstruct(this.parentElement);
        
        document.querySelector(notificationDOMParent).appendChild(this.parentElement);
    }

    /**
     * Add a div highlighting this notification's selection to the DOM.
     * 
     * @param styleClass style sheet class of the highlight
     */
    addHighlight(styleClass: string){
        this.highlightElement = document.createElement("div");
        this.highlightElement.classList.add(styleClass);
        this.wrapAroundCodeConstruct(this.highlightElement);
        this.parentElement.appendChild(this.highlightElement);
    }

    /**
     * Set the transform of the highlight element to cover this notification's selection.
     */
    wrapAroundCodeConstruct(element: HTMLDivElement){
        const transform = this.editor.computeBoundingBox(this.selection);

        element.style.top = `${transform.y + 5}px`;
        element.style.left = `${transform.x - 0}px`;

        element.style.width = `${transform.width + 0 * 2}px`;
        element.style.height = `${transform.height - 5 * 2}px`;
    }

    /**
     * Remove this notification's DOM element and all of its children from the DOM.
     */
    removeNotificationFromDOM(){
        const parent = document.querySelector(notificationDOMParent);
        parent.removeChild(document.getElementById(this.domId));
    }

    /**
     * Assigns a unique DOM id to the notification's parent element.
     */
    setDomId(){
        Notification.currDomId++;

        this.domId = `${this.notificationDomIdPrefix}-${Notification.currDomId}`;
        this.highlightElement.setAttribute("id", this.domId)
    }
}

/**
 * Notification that allows user to hover over a selection to see more information.
 */
export class HoverNotification extends Notification implements NotificationBox{
    /**
     * The ms delay between when the user hovers off of the notification highlight and the time the hover
     * box of the notification disappears.
     */
    static notificationFadeDelay = 500;

    notificationBox = null;
    showNotificationBox = false;

    constructor(editor: Editor, selection: monaco.Selection, index: number = -1, msg: string = ""){
        super(editor, selection, index);

        this.messageText = msg;

        this.notificationDomIdPrefix = "hoverNotification";
        this.addHighlight("hoverNotificationHighlight");
        this.setDomId();

        this.addNotificationBox(); //hover box

        document.querySelector(notificationDOMParent).appendChild(this.highlightElement);

        this.moveWithinEditor(); //needs to run after the notif element is added to the DOM. Otherwise cannot get offset dimensions when necessary.
    }

    addText(){
        this.notificationTextDiv = document.createElement("div");
        this.notificationTextDiv.appendChild(document.createTextNode(this.messageText));//better to use this for now. Once we have a text "beautifier" we can use innerHTML instead. 
        this.notificationBox.appendChild(this.notificationTextDiv);
    }

    addNotificationBox(){
        this.notificationBox = document.createElement("div");
        this.notificationBox.classList.add("hoverNotificationHover");
        this.notificationBox.style.visibility = "hidden";

        this.setNotificationBehaviour();
        this.addText();
        this.setNotificationBoxBounds();

        this.parentElement.appendChild(this.notificationBox);
    }

    setNotificationBoxBounds(){
        const editorDims = {width: (document.getElementById("editor").getElementsByClassName("monaco-scrollable-element editor-scrollable vs")[0] as HTMLElement).offsetWidth,
                            height: (document.getElementById("editor").getElementsByClassName("monaco-scrollable-element editor-scrollable vs")[0] as HTMLElement).offsetHeight
                           }

        this.notificationBox.style.width = `${0.5 * (editorDims.width > 0 ? editorDims.width  : hoverNotificationDefaultWidth)}px`;
        this.notificationBox.style.maxWidth = `${0.5 * (editorDims.width  > 0 ? editorDims.width  : hoverNotificationDefaultWidth)}px`;
        this.notificationBox.style.maxHeight = `${0.2 * (editorDims.height > 0 ? editorDims.height : hoverNotificationDefaultHeight)}px`
    }

    setNotificationBehaviour(){
        this.highlightElement.addEventListener("mouseenter", () => {
            this.notificationBox.style.visibility = "visible"
        })

        this.highlightElement.addEventListener("mouseleave", () => {
            setTimeout(() => {
                if(!this.showNotificationBox){
                    this.notificationBox.style.visibility = "hidden"
                }
            }, 100)
        })

        this.notificationBox.addEventListener("mouseenter", () => {
            this.showNotificationBox = true;
            this.notificationBox.style.visibility = "visible"
        })

        this.notificationBox.addEventListener("mouseleave", () => {
            this.showNotificationBox = false;
            this.notificationBox.style.visibility = "hidden"
        })
    }

    moveWithinEditor(){
        this.notificationBox.style.left = `${(-(this.notificationBox.offsetWidth - this.highlightElement.offsetWidth / 2) / 2) + this.highlightElement.offsetWidth / 2}px`;
        this.notificationBox.style.top = `${-this.notificationBox.offsetHeight}px`; //TODO: Maybe raise it up by a few pixels, but it being adjacent could help with hovering detection. THis is only for when it is above the code line, when it is below it actually has some space between the line and the box.

        if((this.highlightElement.offsetLeft + this.notificationBox.offsetLeft) < 0){
            this.notificationBox.style.left = `${-this.highlightElement.offsetLeft}px`;
        }

        if(this.highlightElement.offsetTop + this.notificationBox.offsetTop < 0){
            this.notificationBox.style.top = `${this.editor.computeCharHeight() - 10}px`;
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
        this.addHighlight("popUpNotification"); //probably need to remove this call or make it conditional since we are planning on showing both hovers and pop ups for the same warning at the same time

        this.addNotificationBox();

        document.querySelector(notificationDOMParent).appendChild(this.highlightElement);
    }  

    addNotificationBox(){
        this.notificationBox = document.createElement("div");
        this.notificationBox.classList.add("popUpNotification");

        //this.setNotificationBoxBounds();
        //this.setNotificationBehaviour();
        //this.moveWithinEditor();

        this.highlightElement.appendChild(this.notificationBox);
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
    addText(){
        throw new Error("NOT IMPLEMENTED...")
    }
}