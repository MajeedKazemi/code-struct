import * as monaco from 'monaco-editor';
import Editor from '../editor/editor';
import { CodeConstruct, Module, Scope, Statement, VarAssignmentStmt, VariableReferenceExpr } from '../syntax-tree/ast';


/**
 * Default width of the hover textbox for a hover notification (px).
 */
const hoverNotificationDefaultWidth = 200;

/**
 * Default height of the hover textbox for a hover notification (px).
 */
const hoverNotificationDefaultHeight = 75;

/**
 * Default width of the text highlight for a hover notification (px).
 */
const highlightDefaultWidth = 10;

/**
 * Default height of the text highlight for a hover notification (px).
 */
const highlightDefaultHeight = 25;

/**
 * Classname of the DOM element to which notifications are appended to.
 */
const notificationDOMParent = ".lines-content.monaco-editor-background";

//TODO: Probably should refactor to a Builder. It pretty much is already.
/**
 * 
 */
interface NotificationBox{
    /**
     * Build a textbox for the Notification and add it to the DOM.
     */
    addNotificationBox() : void;

    /**
     * Build the contents of the nofiticationBox element.
     */
    addText() : void;

    /**
     * Set the transform of the notification.
     */
    setNotificationBoxBounds() : void;

    /**
     * Set additional notifications behaviours.
     */
    setNotificationBehaviour() : void;

    /**
     * Adjust the Notification's position within the editor.
     */
    moveWithinEditor() : void;
}

/**
 * A Notification shown when user performs invalid actions.
 */
export abstract class Notification{
    /**
     * Next integer that can be appended to notificationDomIdPrefix to create a unique DOM id for the next notification.
     */
         static currDomId: number = 0;

    /**
     * HTML of the notification message.
     */
    messageText: string;

    /**
     * Editor instance of the program.
     */
    editor: Editor;

    /**
     * Selection within the editor that caused this notification.
     */
    selection: monaco.Selection;

    /**
     * Index of this notification within the "notifications" list of the NotificationSystemController instance that created it.
     */
    index: number;

    /**
     * Top-level DOM element of the notification. Everything else is appended to it.
     */
    parentElement: HTMLDivElement;

    /**
     * DOM element of the highlight for the editor area that triggered this notification.
     */
    highlightElement: HTMLDivElement;

    /**
     * DOM element of the notification textbox.
     */
    notificationTextDiv: HTMLDivElement;

    /**
     * Unique DOM id of this Notification's parentElement.
     */
    domId: string;

    /**
     * DOM id prefix of this notification.
     */
    notificationDomIdPrefix: string;

    /**
     * Amount to subtract from the x-coordinate of the mouse cursor to make the left side of the parentElement be the cursor's origin along x.
     */
    mouseLeftOffset: number;
    
    /**
     * Amount to subtract from the y-coordinate of the mouse cursor to make the top side of the parentElement be the cursor's origin along y.
     */
    mouseTopOffset: number;

    /**
     * Main textbox of this notification.
     */
    notificationBox: HTMLDivElement;

    callerId: string;

    constructor(editor: Editor, selection: monaco.Selection, index: number = -1){
        this.selection = selection;
        this.editor = editor;
        this.index = index;
        this.callerId = "";

        this.parentElement = document.createElement("div");
        this.parentElement.classList.add("notificationParent");

        if(this.selection) this.wrapAroundCodeConstruct(this.parentElement);
        
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

        this.highlightElement.style.width = `${this.parentElement.offsetWidth > 0 ? this.parentElement.offsetWidth : highlightDefaultWidth}px`;
        this.highlightElement.style.height = `${this.parentElement.offsetHeight > 0 ? this.parentElement.offsetHeight : highlightDefaultHeight}px`;

        this.parentElement.appendChild(this.highlightElement);
    }

    /**
     * Set the transform of the given element to cover this notification's selection.
     * 
     * @param element html div to set the transform of
     */
    wrapAroundCodeConstruct(element: HTMLDivElement){
        const transform = this.editor.computeBoundingBox(this.selection);

        element.style.top = `${transform.y + 5}px`;
        element.style.left = `${transform.x - 0}px`;

        element.style.width = `${transform.width > 0 ? transform.width + 0 * 2 : highlightDefaultWidth}px`;
        element.style.height = `${transform.height > 0 ? transform.height - 5 * 2 : highlightDefaultHeight}px`;
    }

    /**
     * Remove this notification's DOM element and all of its children from the DOM.
     */
    removeNotificationFromDOM(){
        const parent = document.querySelector(notificationDOMParent);
        parent.removeChild(document.getElementById(this.domId));
    }

    /**
     * Assign a unique DOM id to the notification's parent element.
     */
    setDomId(){
        Notification.currDomId++;

        this.domId = `${this.notificationDomIdPrefix}-${Notification.currDomId}`;
        this.parentElement.setAttribute("id", this.domId)
    }

    addText(){
        this.notificationTextDiv = document.createElement("div");
        this.notificationTextDiv.innerHTML = this.messageText;
        this.notificationBox.appendChild(this.notificationTextDiv);
    }

    /**
     * Adds an area for displaying in-scope variable suggestions below the text of the notification textbox.
     * 
     * @param scope       scope to check in-scope variables against
     * @param module      AST to insert suggestions into, if clicked
     * @param focusedNode node to insert suggestion into, if clicked
     * @param focusedPos  position within the editor used for identifying in-scope vars to suggest
     */
    addInScopeVarsArea(scope: Scope, module: Module, focusedNode: CodeConstruct, focusedPos: monaco.Position){
        const suggestionDiv = document.createElement("div");
        suggestionDiv.classList.add("varScopeSuggestion");

        const heading = document.createElement("h3");
        heading.textContent = "Available Variables in this Scope:";
        suggestionDiv.appendChild(heading);

        scope.getValidReferences(focusedPos.lineNumber).forEach(ref => {
            const button = document.createElement("button");
            button.classList.add("suggestionVarAdd");
            button.textContent = (ref.statement as VarAssignmentStmt).getIdentifier();

            //TODO: When hovered over, it highlights all code lines where this variable could be used
            button.addEventListener("click", () => {
                module.insert(new VariableReferenceExpr((ref.statement as VarAssignmentStmt).getIdentifier(), (ref.statement as VarAssignmentStmt).dataType, (ref.statement as VarAssignmentStmt).buttonId, ((focusedNode.rootNode instanceof Module) ? null : focusedNode.rootNode as CodeConstruct) ), focusedNode);
            })

            suggestionDiv.appendChild(button);
        });

        this.notificationBox.appendChild(suggestionDiv);
    }

    /**
     * Update the position of the notification based on where the given code construct has moved, if it has moved.
     * 
     * @param code code construct the position of which was changed
     */
    updateParentElementPosition(code: CodeConstruct){
        const newSelection = code.getSelection();

        //top
        if(this.selection.startLineNumber != newSelection.startLineNumber){
            const diff = newSelection.startLineNumber - this.selection.startLineNumber;
            this.selection = newSelection;

            this.parentElement.style.top = `${this.parentElement.offsetTop + diff * this.editor.computeCharHeight()}px`;

            this.updateMouseOffsets();
        }

        //left
        if(this.selection.startColumn != newSelection.startColumn){
            const diff = newSelection.startColumn - this.selection.startColumn;

            this.selection = newSelection;

            this.parentElement.style.left = `${this.parentElement.offsetLeft + diff * this.editor.computeCharWidth()}px`;

            this.updateMouseOffsets();
        }
    }

    /**
     * Update mouse offset values when the notification's position changes
     */
    updateMouseOffsets(){
        this.mouseLeftOffset = document.getElementById("editor").offsetLeft +
                                     (document.getElementById("editor")
                                        .getElementsByClassName("monaco-editor no-user-select  showUnused showDeprecated vs")[0]
                                        .getElementsByClassName("overflow-guard")[0]
                                        .getElementsByClassName("margin")[0] as HTMLElement)
                                        .offsetWidth

        //TODO: This top margin is inconsistent for some reason. Sometimes it is there sometimes it is not, which will make this calculation
        //wrong from time to time...
        this.mouseTopOffset =  parseFloat(window.getComputedStyle(document.getElementById("editor")).paddingTop);
    }
}

/**
 * Notification that allows user to hover over a selection to see more information.
 */
export class HoverNotification extends Notification implements NotificationBox{
    /**
     * How often the collision between the mouse cursor and a HoverNotification is checked. (ms)
     */
    static notificationHighlightCollisionCheckInterval = 500;

    /**
     * How long a HoverNotification stays on screen after it is not being hovered over anymore. (ms)
     */
    static notificationFadeTime = 100;

    /**
     * Determines whether the mouse cursor is currently hovering over this notification's highlighted area.
     */
    showNotificationBoxHighlight = false;

    /**
     * Determines whether the mouse cursor is currently hovering over this notification's textbox.
     */
    showNotificationBoxNotif = false;

    notificationBox = null;

    constructor(editor: Editor, selection: monaco.Selection, index: number = -1, msg: string = "", style: string = "hoverNotificationHighlight"){
        super(editor, selection, index);

        this.messageText = msg;

        this.notificationDomIdPrefix = "hoverNotification";
        this.addHighlight(style);
        this.setDomId();

        this.addNotificationBox(); //hover box

        this.updateMouseOffsets();
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
        setInterval(() => {
            if(this.editor){
                this.moveWithinEditor(); //needs to run after the notif element is added to the DOM. Otherwise cannot get offset dimensions when necessary.
                                         //NOTE: Move this back into the constructor if this makes setInterval slow down the browser! Doing so will cause #72
                                         //but it is a very minor textbox placement issue.

                let x = this.editor.mousePosWindow[0];
                let y = this.editor.mousePosWindow[1];

                x -= this.mouseLeftOffset;
                y -= this.mouseTopOffset;

                //collision with highlight box
                if(x >= this.parentElement.offsetLeft && 
                   x <= this.parentElement.offsetLeft + this.parentElement.offsetWidth &&
                   y >= this.parentElement.offsetTop - this.editor.scrollOffsetTop &&
                   y <= this.parentElement.offsetTop + this.parentElement.offsetHeight - this.editor.scrollOffsetTop
                ){
                        this.notificationBox.style.visibility = "visible"
                        this.showNotificationBoxNotif = true
                }
                else{
                    this.showNotificationBoxNotif = false;
                    setTimeout(() => {
                        if(!this.showNotificationBoxHighlight){
                            this.notificationBox.style.visibility = "hidden"
                        }
                    }, HoverNotification.notificationFadeTime)
                }
            }
        }, HoverNotification.notificationHighlightCollisionCheckInterval)

        this.notificationBox.addEventListener("mouseenter", () => {
            this.showNotificationBoxHighlight = true;
            this.notificationBox.style.visibility = "visible"
        })

        this.notificationBox.addEventListener("mouseleave", () => {
            this.showNotificationBoxHighlight = false;
            setTimeout(() => {
                if(!this.showNotificationBoxNotif){
                    this.notificationBox.style.visibility = "hidden"
                }
            }, HoverNotification.notificationFadeTime)
        })
    }

    moveWithinEditor(){
        this.notificationBox.style.left = `${(-(this.notificationBox.offsetWidth - this.highlightElement.offsetWidth / 2) / 2) + this.highlightElement.offsetWidth / 2}px`;
        this.notificationBox.style.top = `${-this.notificationBox.offsetHeight}px`; //TODO: Maybe raise it up by a few pixels, but it being adjacent could help with hovering detection. THis is only for when it is above the code line, when it is below it actually has some space between the line and the box.

        if((this.parentElement.offsetLeft + this.notificationBox.offsetLeft) < 0){
            this.notificationBox.style.left = `${-this.parentElement.offsetLeft}px`;
        }

        if(this.parentElement.offsetTop + this.notificationBox.offsetTop < 0){
            this.notificationBox.style.top = `${this.editor.computeCharHeight()}px`;
        }
    }
}

















//TODO: This class is unfinished since we don't have a clear use for it yet. Once there is a need for it, it can be quickly completed.
/**
 * Notification that stays on the screen for a given period of time and then disappears.
 */
export class PopUpNotification extends Notification implements NotificationBox{
    notificationBox = null;
    position = null;

    constructor(editor: Editor, index: number = -1, msg: string = "", position: object = {top: 0, left: 0}){
        super(editor, null, index);

        this.messageText = msg;
        this.position = position;

        this.notificationDomIdPrefix = "popUpNotification";
        this.setDomId();

        this.addNotificationBox();
        this.moveWithinEditor();

        document.querySelector(notificationDOMParent).appendChild(this.parentElement);
    }  

    addNotificationBox(){
        this.notificationBox = document.createElement("div");
        this.notificationBox.classList.add("popUpNotification");

        this.addText();

        this.parentElement.appendChild(this.notificationBox);
    }

    setNotificationBoxBounds(){
        throw new Error("NOT IMPLEMENTED...")
    }

    setNotificationBehaviour(){
        throw new Error("NOT IMPLEMENTED...")
    }

    moveWithinEditor(){
        this.parentElement.style.left = `${this.position.left}px`;
        this.parentElement.style.top = `${this.position.top}px`;
    }
}