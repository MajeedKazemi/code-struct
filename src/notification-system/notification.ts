import * as monaco from "monaco-editor";
import { Editor } from "../editor/editor";
import {
    Callback,
    CallbackType,
    CodeConstruct,
    Module,
    Scope,
    Statement,
    TypedEmptyExpr,
    VarAssignmentStmt,
    VariableReferenceExpr,
} from "../syntax-tree/ast";

/**
 * Class name of the DOM element to which notifications are appended to.
 */
const editorDomElementClass = ".lines-content.monaco-editor-background";

/**
 * Default width of the hover textbox for a hover notification (px).
 */
const HOVER_NOTIFICATION_DEFAULT_WIDTH = 200;

/**
 * Default height of the hover textbox for a hover notification (px).
 */
const HOVER_NOTIFICATION_DEFAULT_HEIGHT = 75;

/**
 * Default width of the text highlight for a hover notification (px).
 */
const HIGHLIGHT_DEFAULT_WIDTH = 10;

/**
 * Default height of the text highlight for a hover notification (px).
 */
const HIGHLIGHT_DEFAULT_HEIGHT = 25;

/**
 * Represents a visual DOM element that is attached to a code construct in the editor.
 */
abstract class ConstructVisualElement {
    static idPrefix = "visualElement";
    static idCounter = 0;

    /**
     * Code that this element is attached to.
     */
    protected code: CodeConstruct;

    /**
     * Current selection of the element. Used for calculating displacement during position changes.
     */
    protected selection: monaco.Selection;

    /**
     * Editor object.
     */
    protected editor: Editor;

    /**
     * HTML element that represents this object in the DOM.
     */
    protected domElement: HTMLDivElement;

    /**
     * The id of the div associated with this object in the DOM.
     */
    protected domId: string;

    /**
     * Callbacks this object listens to.
     */
    private callbacks: Map<string, CallbackType>;

    constructor(editor: Editor, codeToHighlight: CodeConstruct) {
        this.code = codeToHighlight;
        this.selection = this.code.getSelection();
        this.editor = editor;

        this.callbacks = new Map<string, CallbackType>();

        this.createDomElement();
        ConstructHighlight.idCounter++;
        this.domElement.id = ConstructVisualElement.idPrefix + ConstructHighlight.idCounter;

        const onChange = new Callback(
            (() => {
                this.moveToConstructPosition();
                this.updateDimensions();
            }).bind(this)
        )

        const onDelete = new Callback(
            (() => {
                this.removeFromDOM();
            }).bind(this)
        )

        this.callbacks.set(onDelete.callerId, CallbackType.delete)
        this.callbacks.set(onChange.callerId, CallbackType.change);

        this.code.subscribe(
            CallbackType.change,
            onChange
        );

        this.code.subscribe(
            CallbackType.delete,
            onDelete
        );
    }

    /**
     * Remove this element and its children from the DOM. (Should always be called on the deletion of this.code)
     */
    removeFromDOM(): void {
        this.domElement.remove();

        for(const entry of this.callbacks){
            this.code.unsubscribe(entry[1], entry[0]);
        }
    }

    /**
     * Construct the DOM element for this visual.
     */
    protected createDomElement(): void {
        this.domElement = document.createElement("div");
        this.domElement.classList.add("codeVisual");
    }

    /**
     * Update the position of this.domElement when this.code's position changes. (Should always be called on the change of this.code)
     */
    protected moveToConstructPosition(): void {}

    /**
     * Update the dimensions of this visual element. Called when the code construct the visual is attached to is updated in some way (moved, inserted into, etc...)
     */
    protected updateDimensions(): void{}

    getDomElement(): HTMLDivElement {
        return this.domElement;
    }
}

class ConstructHighlight extends ConstructVisualElement {
    constructor(editor: Editor, codeToHighlight: CodeConstruct, rgbColour: [number, number, number, number]) {
        super(editor, codeToHighlight);

        this.changeHighlightColour(rgbColour);
    }

    protected createDomElement() {
        super.createDomElement();
        this.domElement.classList.add("highlight");

        this.updateDimensions(true);

        document.querySelector(editorDomElementClass).appendChild(this.domElement);
    }

    protected moveToConstructPosition(): void {
        const newSelection = this.code.getSelection();

        //top
        if (this.selection.startLineNumber != newSelection.startLineNumber) {
            const diff = newSelection.startLineNumber - this.selection.startLineNumber;
            this.selection = newSelection;

            this.domElement.style.top = `${this.domElement.offsetTop + diff * this.editor.computeCharHeight()}px`;
        }

        //left
        if (this.selection.startColumn != newSelection.startColumn) {
            const diff = newSelection.startColumn - this.selection.startColumn;

            this.selection = newSelection;

            this.domElement.style.left = `${this.domElement.offsetLeft + diff * this.editor.computeCharWidth()}px`;
        }
    }

    /**
     * Change the colour of this highlight to rgbColour.
     *
     * @param rgbColour array of four numbers representing the CSS rgb(R, G, B, A) construct
     */
    changeHighlightColour(rgbColour: [number, number, number, number]) {
        this.domElement.style.backgroundColor = `rgb(${rgbColour[0]}, ${rgbColour[1]}, ${rgbColour[2]}, ${rgbColour[3]})`;
    }

    protected updateDimensions(firstInsertion: boolean = false){
        //instanceof Token does not have lineNumber
        let lineNumber = this.code.getLineNumber();

        let top = 0;
        let left = 0;
        let width = 0;
        let height = 0;

        //no idea why these need separate handling... This was the easiest fix.
        if (this.code instanceof TypedEmptyExpr) {
            const transform = this.editor.computeBoundingBox(this.code.getSelection());
            const text = this.code.getRenderText();

            top = transform.y + 5;
            left = (this.code.getSelection().startColumn - 1) * this.editor.computeCharWidth(lineNumber);

            width =
                text.length * this.editor.computeCharWidth(lineNumber) > 0
                    ? text.length * this.editor.computeCharWidth(lineNumber)
                    : HIGHLIGHT_DEFAULT_WIDTH;
            height = transform.height > 0 ? transform.height - 5 * 2 : HIGHLIGHT_DEFAULT_HEIGHT;
        } else {
            const text = this.code.getRenderText();
            const transform = this.editor.computeBoundingBox(this.code.getSelection());

            top = (this.code.getSelection().startLineNumber - 1) * this.editor.computeCharHeight();
            left = transform.x;
            height = Math.floor(this.editor.computeCharHeight() * 0.95);
            width = text.length * this.editor.computeCharWidth(lineNumber);
        }

        if(firstInsertion){
            this.domElement.style.top = `${top}px`;
            this.domElement.style.left = `${left}px`;
        }

        this.domElement.style.width = `${width}px`;
        this.domElement.style.height = `${height}px`;
    }
}

export class Notification extends ConstructVisualElement {
    /**
     * Index into NotficationSystemController.notifications
     */
    systemIndex: number;

    warningTxt: string;

    textElement: HTMLDivElement;

    constructor(editor: Editor, code: CodeConstruct, warningTxt: string, index: number = -1) {
        super(editor, code);

        this.warningTxt = warningTxt;
        this.textElement.innerHTML = this.warningTxt;
        this.systemIndex = index;
    }

    protected createDomElement() {
        super.createDomElement();
        this.domElement.classList.add("textBox");

        this.textElement = document.createElement("div");
        this.domElement.appendChild(this.textElement);

        document.querySelector(editorDomElementClass).appendChild(this.domElement);
    }
}

export class HoverNotification extends Notification {
    private mouseLeftOffset: number;
    private mouseTopOffset: number;
    private highlight: ConstructHighlight;
    private showHighlight: boolean = false;
    private showTextbox: boolean = false;

    private notificationHighlightCollisionCheckInterval = 500;
    private notificationFadeTime = 100;

    constructor(
        editor: Editor,
        code: CodeConstruct,
        warningText: string,
        highlightColour: [number, number, number, number],
        index: number = -1
    ) {
        super(editor, code, warningText, index);

        this.highlight = new ConstructHighlight(editor, code, highlightColour);

        this.updateMouseOffsets();
        this.scheduleCollisionCheck();
    }

    protected createDomElement() {
        super.createDomElement();

        this.setNotificationBoxBounds();

        //set the initial position
        const transform = this.editor.computeBoundingBox(this.selection);

        this.domElement.style.top = `${(this.selection.startLineNumber - 2) * this.editor.computeCharHeight()}px`; // 0 is the line below this.code, -1 is this.code's line, -2 is the line above this.coded
        this.domElement.style.left = `${transform.x - this.domElement.offsetWidth / 2}px`;

        //in case we are initially at the top-most line
        this.moveWithinEditor();

        this.domElement.style.zIndex = "1";
        this.domElement.style.visibility = "hidden";
    }

    protected moveToConstructPosition() {
        const newSelection = this.code.getSelection();

        //top
        if (this.selection.startLineNumber != newSelection.startLineNumber) {
            const diff = newSelection.startLineNumber - this.selection.startLineNumber;
            this.selection = newSelection;

            this.domElement.style.top = `${this.domElement.offsetTop + diff * this.editor.computeCharHeight()}px`;
        }

        //left
        if (this.selection.startColumn != newSelection.startColumn) {
            const diff = newSelection.startColumn - this.selection.startColumn;

            this.selection = newSelection;

            this.domElement.style.left = `${this.domElement.offsetLeft + diff * this.editor.computeCharWidth()}px`;
        }

        this.updateMouseOffsets(); //need to call this in case we went outside of the editor window with the above updates
    }

    private moveWithinEditor() {
        if (this.domElement.offsetLeft < 0) {
            this.domElement.style.left = `${
                this.selection.startColumn * this.editor.computeCharWidth(this.code.getLineNumber())
            }px`;
        }

        if (this.domElement.offsetTop < 0) {
            this.domElement.style.top = `${this.editor.computeCharHeight()}px`;
        }
    }

    /**
     * Set the width, maxWidth and maxHeight of this notification's textbox based on editor window dimensions.
     */
    private setNotificationBoxBounds() {
        const editorDims = {
            width: (
                document
                    .getElementById("editor")
                    .getElementsByClassName("monaco-scrollable-element editor-scrollable vs")[0] as HTMLElement
            ).offsetWidth,
            height: (
                document
                    .getElementById("editor")
                    .getElementsByClassName("monaco-scrollable-element editor-scrollable vs")[0] as HTMLElement
            ).offsetHeight,
        };

        this.domElement.style.width = `${
            0.5 * (editorDims.width > 0 ? editorDims.width : HOVER_NOTIFICATION_DEFAULT_WIDTH)
        }px`;
        this.domElement.style.maxWidth = `${
            0.5 * (editorDims.width > 0 ? editorDims.width : HOVER_NOTIFICATION_DEFAULT_WIDTH)
        }px`;
        this.domElement.style.maxHeight = `${
            0.2 * (editorDims.height > 0 ? editorDims.height : HOVER_NOTIFICATION_DEFAULT_HEIGHT)
        }px`;
    }

    /**
     * Update mouse offset values used for collision detection when the notification's position changes. Needs to be called whenever the notif's position changes.
     */
    private updateMouseOffsets() {
        this.mouseLeftOffset =
            document.getElementById("editor").offsetLeft +
            (
                document
                    .getElementById("editor")
                    .getElementsByClassName("monaco-editor no-user-select  showUnused showDeprecated vs")[0]
                    .getElementsByClassName("overflow-guard")[0]
                    .getElementsByClassName("margin")[0] as HTMLElement
            ).offsetWidth;

        //TODO: This top margin is inconsistent for some reason. Sometimes it is there sometimes it is not, which will make this calculation
        //wrong from time to time...
        this.mouseTopOffset = parseFloat(window.getComputedStyle(document.getElementById("editor")).paddingTop);
    }

    private scheduleCollisionCheck() {
        setInterval(() => {
            if (this.editor) {
                const collisionElement = this.highlight.getDomElement();

                let x = this.editor.mousePosWindow[0];
                let y = this.editor.mousePosWindow[1];

                x -= this.mouseLeftOffset;
                y -= this.mouseTopOffset;

                //collision with highlight box
                if (
                    x >= collisionElement.offsetLeft &&
                    x <= collisionElement.offsetLeft + collisionElement.offsetWidth &&
                    y >= collisionElement.offsetTop - this.editor.scrollOffsetTop &&
                    y <= collisionElement.offsetTop + collisionElement.offsetHeight - this.editor.scrollOffsetTop
                ) {
                    this.domElement.style.visibility = "visible";
                    this.showTextbox = true;
                } else {
                    this.showTextbox = false;

                    setTimeout(() => {
                        if (!this.showHighlight) {
                            this.domElement.style.visibility = "hidden";
                        }
                    }, this.notificationFadeTime);
                }
            }
        }, this.notificationHighlightCollisionCheckInterval);

        this.domElement.addEventListener("mouseenter", () => {
            this.showHighlight = true;
            this.domElement.style.visibility = "visible";
        });

        this.domElement.addEventListener("mouseleave", () => {
            this.showHighlight = false;

            setTimeout(() => {
                if (!this.showTextbox) {
                    this.domElement.style.visibility = "hidden";
                }
            }, this.notificationFadeTime);
        });
    }

     removeFromDOM() {
        super.removeFromDOM();
        this.highlight.removeFromDOM();
     }
}

export class PopUpNotification extends Notification {
    static warningTime: number = 5000;

    constructor(editor: Editor, code: CodeConstruct, warningTxt: string, index: number = -1) {
        super(editor, code, warningTxt, index);
    }

    protected createDomElement() {
        super.createDomElement();

        this.domElement.classList.add("popUp");

        //set position based on code
        this.domElement.style.left = `${
            this.selection.startColumn * this.editor.computeCharWidth(this.code.getLineNumber())
        }px`;
        this.domElement.style.top = `${this.selection.startLineNumber * this.editor.computeCharHeight()}px`;
    }
}
