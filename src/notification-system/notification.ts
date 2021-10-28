import { Selection } from "monaco-editor";
import { Editor } from "../editor/editor";
import { EDITOR_DOM_ID } from "../editor/toolbox";
import { nova } from "../index";
import { CodeConstruct, Statement, TypedEmptyExpr } from "../syntax-tree/ast";
import { Callback, CallbackType } from "../syntax-tree/callback";

/**
 * Class name of the DOM element to which notifications are appended to.
 */
const editorDomElementClass = ".lines-content.monaco-editor-background";

/**
 * Default width of the hover textbox for a hover notification (px).
 */
const HOVER_MESSAGE_DEFAULT_WIDTH = 250;

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
abstract class CodeHighlight {
    static idPrefix = "visualElement";
    static idCounter = 0;

    /**
     * Code that this element is attached to.
     */
    protected code: CodeConstruct;

    /**
     * Current selection of the element. Used for calculating displacement during position changes.
     */
    protected selection: Selection;

    /**
     * Editor object.
     */
    protected editor: Editor;

    /**
     * HTML element that represents this object in the DOM.
     */
    protected domElement: HTMLDivElement;

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
        this.domElement.id = CodeHighlight.idPrefix + ConstructHighlight.idCounter;

        const onChange = new Callback(
            (() => {
                this.moveToConstructPosition();
                this.updateDimensions();
            }).bind(this)
        );

        const onDelete = new Callback(
            (() => {
                this.removeFromDOM();
            }).bind(this)
        );

        this.callbacks.set(onDelete.callerId, CallbackType.delete);
        this.callbacks.set(onChange.callerId, CallbackType.change);

        this.code.subscribe(CallbackType.change, onChange);

        this.code.subscribe(CallbackType.delete, onDelete);
    }

    /**
     * Remove this element and its children from the DOM. (Should always be called on the deletion of this.code)
     */
    removeFromDOM(): void {
        this.domElement.remove();

        for (const entry of this.callbacks) {
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
    protected updateDimensions(): void {}

    getDomElement(): HTMLDivElement {
        return this.domElement;
    }
}

export class ConstructHighlight extends CodeHighlight {
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

            this.domElement.style.left = `${
                this.domElement.offsetLeft +
                diff * this.editor.computeCharWidthInvisible(this.selection.startLineNumber)
            }px`;
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

    protected updateDimensions(firstInsertion: boolean = false) {
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
            left = (this.code.getSelection().startColumn - 1) * this.editor.computeCharWidthInvisible(lineNumber);

            width =
                text.length * this.editor.computeCharWidthInvisible(lineNumber) > 0
                    ? text.length * this.editor.computeCharWidthInvisible(lineNumber)
                    : HIGHLIGHT_DEFAULT_WIDTH;
            height = transform.height > 0 ? transform.height - 5 * 2 : HIGHLIGHT_DEFAULT_HEIGHT;
        } else {
            const text = this.code.getRenderText();
            const transform = this.editor.computeBoundingBox(this.code.getSelection());

            top = (this.code.getSelection().startLineNumber - 1) * this.editor.computeCharHeight();
            left = transform.x;
            height = Math.floor(this.editor.computeCharHeight() * 0.95);
            width = text.length * this.editor.computeCharWidthInvisible(lineNumber);
        }

        if (firstInsertion) {
            this.domElement.style.top = `${top}px`;
            this.domElement.style.left = `${left}px`;
        }

        this.domElement.style.width = `${width}px`;
        this.domElement.style.height = `${height}px`;
    }
}

export class InlineMessage extends CodeHighlight {
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
        this.textElement.classList.add("text-container-style");
        this.domElement.appendChild(this.textElement);

        document.querySelector(editorDomElementClass).appendChild(this.domElement);
    }
}

export class HoverMessage extends InlineMessage {
    private mouseLeftOffset: number;
    private mouseTopOffset: number;
    private highlight: ConstructHighlight;
    private showHighlight: boolean = false;
    private showTextBox: boolean = false;

    private highlightCheckInterval = 500;
    private timer;
    private messageFadeTime = 100;

    private buttons = [];

    /**
     * HTML element that contains the main content of the message.
     */
    protected contentEl: HTMLDivElement;

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

    createButton(txt: string): HTMLDivElement {
        const button = document.createElement("div");
        button.classList.add("button");
        button.innerHTML = txt.replace(/---/g, "<hole1></hole1>");

        this.contentEl.appendChild(button);
        this.buttons.push(button);

        return button;
    }

    attachButton(button: HTMLDivElement) {
        button.classList.add("button");

        this.contentEl.appendChild(button);
        this.buttons.push(button);
    }

    protected createDomElement() {
        this.domElement = document.createElement("div");
        this.domElement.classList.add("codeVisual");

        const header = document.createElement("div");
        header.innerText = "Fix This";
        header.classList.add("hover-msg-header");
        this.domElement.append(header);

        this.domElement.classList.add("textBox");

        this.contentEl = document.createElement("div");
        this.contentEl.classList.add("msg-content-container");
        this.domElement.appendChild(this.contentEl);

        this.textElement = document.createElement("div");
        this.textElement.classList.add("text-container-style");
        this.contentEl.appendChild(this.textElement);

        document.querySelector(editorDomElementClass).appendChild(this.domElement);

        //set the initial position
        const currentLinePosition = nova.focus.getStatementAtLineNumber(this.code.getLineNumber()).getRightPosition();
        this.domElement.style.top = `${(this.selection.startLineNumber - 1) * this.editor.computeCharHeight()}px`; // 0 is the line below this.code, -1 is this.code's line, -2 is the line above this.code
        this.domElement.style.left = `${
            (currentLinePosition.column + 2) * this.editor.computeCharWidth(currentLinePosition.lineNumber) + 10
        }px`;

        this.domElement.style.zIndex = "10";
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

            this.domElement.style.left = `${
                this.domElement.offsetLeft + diff * this.editor.computeCharWidth(this.selection.startLineNumber)
            }px`;
        } else if (this.selection.endColumn != newSelection.endColumn) {
            const diff = newSelection.endColumn - this.selection.endColumn;

            this.selection = newSelection;

            this.domElement.style.left = `${
                this.domElement.offsetLeft + diff * this.editor.computeCharWidth(this.selection.startLineNumber)
            }px`;
        }

        this.updateMouseOffsets(); //need to call this in case we went outside of the editor window with the above updates
    }

    /**
     * Update mouse offset values used for collision detection when the notification's position changes. Needs to be called whenever the notif's position changes.
     */
    private updateMouseOffsets() {
        this.mouseLeftOffset =
            document.getElementById(EDITOR_DOM_ID).offsetLeft +
            (
                document
                    .getElementById(EDITOR_DOM_ID)
                    .getElementsByClassName("monaco-editor no-user-select  showUnused showDeprecated vs")[0]
                    .getElementsByClassName("overflow-guard")[0]
                    .getElementsByClassName("margin")[0] as HTMLElement
            ).offsetWidth;

        //TODO: This top margin is inconsistent for some reason. Sometimes it is there sometimes it is not, which will make this calculation
        //wrong from time to time...
        this.mouseTopOffset = parseFloat(window.getComputedStyle(document.getElementById("editorArea")).paddingTop);
    }

    private scheduleCollisionCheck() {
        this.timer = setInterval(() => {
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
                    this.showTextBox = true;
                } else {
                    this.showTextBox = false;

                    setTimeout(() => {
                        if (!this.showHighlight) {
                            this.domElement.style.visibility = "hidden";
                        }
                    }, this.messageFadeTime);
                }
            }
        }, this.highlightCheckInterval);

        this.domElement.addEventListener("mouseenter", () => {
            this.showHighlight = true;
            this.domElement.style.visibility = "visible";
        });

        this.domElement.addEventListener("mouseleave", () => {
            this.showHighlight = false;

            setTimeout(() => {
                if (!this.showTextBox) {
                    this.domElement.style.visibility = "hidden";
                }
            }, this.messageFadeTime);
        });
    }

    removeFromDOM() {
        super.removeFromDOM();
        this.highlight.removeFromDOM();
        if (this.timer) clearInterval(this.timer);
    }
}

export class PopUpMessage extends InlineMessage {
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

export class CodeBackground extends CodeHighlight {
    code: Statement;

    constructor(editor: Editor, statement: Statement) {
        super(editor, statement);
        this.changeHighlightColour([33, 33, 255, 0.1]);

        if (statement.hasBody()) {
            for (const line of statement.body) {
                line.background = new CodeBackground(editor, line);
            }

            statement.subscribe(
                CallbackType.replace,
                new Callback(() => {
                    for (const line of statement.body) {
                        if (!line.background) {
                            line.background = new CodeBackground(editor, line);
                            line.background.updateDimensions();
                        }
                    }
                })
            );

            statement.subscribe(
                CallbackType.change,
                new Callback(() => {
                    for (const line of statement.body) {
                        if (!line.background) {
                            line.background = new CodeBackground(editor, line);
                            line.background.updateDimensions();
                        }
                    }
                })
            );

            statement.subscribe(
                CallbackType.delete,
                new Callback(() => {
                    for (const line of statement.body) {
                        if (line.background) line.background.removeFromDOM();
                    }
                })
            );
        }
    }

    protected createDomElement() {
        super.createDomElement();

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

            this.domElement.style.left = `${
                this.domElement.offsetLeft +
                diff * this.editor.computeCharWidthInvisible(this.selection.startLineNumber)
            }px`;
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

    protected updateDimensions(firstInsertion: boolean = false) {
        // instanceof Token does not have lineNumber
        let top = 0;
        let left = 0;
        let width = 0;
        let height = 0;

        const transform = this.editor.computeBoundingBox(this.code.getSelection());

        top = (this.code.getSelection().startLineNumber - 1) * this.editor.computeCharHeight();
        left = transform.x;
        height = Math.floor(this.editor.computeCharHeight());

        // compute max width
        let maxRight = LineDimension.compute(this.code, this.editor).right;

        let outmostRoot: Statement = null;
        let stack = Array<Statement>();

        if (this.code.rootNode instanceof Statement) {
            outmostRoot = this.code.rootNode;
            stack.unshift(outmostRoot);

            while (stack.length > 0) {
                outmostRoot = stack.pop();

                if (outmostRoot instanceof Statement && outmostRoot.rootNode instanceof Statement)
                    stack.unshift(outmostRoot.rootNode);
            }
        }

        if (outmostRoot) {
            stack.unshift(outmostRoot);
            stack.unshift(...outmostRoot.body);
        }

        while (stack.length > 0) {
            const line = stack.pop();
            const lineDim = LineDimension.compute(line, this.editor);

            if (lineDim.right > maxRight) maxRight = lineDim.right;
            if (line.hasBody()) stack.unshift(...line.body);
        }

        width = maxRight - left;

        if (firstInsertion) {
            this.domElement.style.top = `${top}px`;
            this.domElement.style.left = `${left}px`;
        }

        this.domElement.style.width = `${width}px`;
        this.domElement.style.height = `${height}px`;
    }
}

// only build two rectangles: one for the header item + one for the whole body. we can style and give border-radiuses to them:
// header dimensions => left of header + width of max body of statements (recursively)
// body dimensions => left of first item in the body + same max body width + total height of the body statements (recursively)

// onChange or onReplace of one of the body items => it should recalculate these two dimensions, and the boxes

export class ScopeHighlight {
    static idPrefix = "visual-element";
    static idCounter = 0;

    /**
     * Code that this element is attached to.
     */
    protected statement: Statement;

    /**
     * Current selection of the element. Used for calculating displacement during position changes.
     */
    protected selection: Selection;

    /**
     * Editor object.
     */
    protected editor: Editor;

    /**
     * HTML element that represents the header object in the DOM.
     */
    protected headerElement: HTMLDivElement;

    /**
     * HTML element that represents the body object in the DOM.
     */
    protected bodyElement: HTMLDivElement;

    /**
     * Callbacks this object listens to.
     */
    private callbacks: Map<string, CallbackType>;

    constructor(editor: Editor, statement: Statement) {
        this.statement = statement;
        this.selection = this.statement.getSelection();
        this.editor = editor;

        this.callbacks = new Map<string, CallbackType>();

        this.createDomElement();
        ScopeHighlight.idCounter++;
        this.headerElement.id = `scope-header-${ScopeHighlight.idPrefix}-${ScopeHighlight.idCounter}`;
        this.bodyElement.id = `scope-body-${ScopeHighlight.idPrefix}-${ScopeHighlight.idCounter}`;

        const onChange = new Callback(
            (() => {
                this.updateDimensions();
            }).bind(this)
        );

        const onDelete = new Callback(
            (() => {
                this.removeFromDOM();
            }).bind(this)
        );

        for (const line of this.statement.body) {
            line.subscribe(CallbackType.delete, onChange);
            line.subscribe(CallbackType.replace, onChange);
            line.subscribe(CallbackType.change, onChange);
        }

        this.callbacks.set(onDelete.callerId, CallbackType.delete);
        this.callbacks.set(onChange.callerId, CallbackType.change);
        this.callbacks.set(onChange.callerId, CallbackType.replace);

        this.statement.subscribe(CallbackType.replace, onChange);
        this.statement.subscribe(CallbackType.change, onChange);
        this.statement.subscribe(CallbackType.delete, onDelete);
    }

    /**
     * Remove this element and its children from the DOM. (Should always be called on the deletion of this.code)
     */
    removeFromDOM(): void {
        this.headerElement.remove();
        this.bodyElement.remove();

        for (const entry of this.callbacks) {
            this.statement.unsubscribe(entry[1], entry[0]);
        }
    }

    /**
     * Construct the DOM element for this visual.
     */
    protected createDomElement(): void {
        this.headerElement = document.createElement("div");
        this.headerElement.classList.add("scope-header-highlight");
        this.headerElement.style.backgroundColor = "rgba(75, 200, 255, 0.1)";

        this.bodyElement = document.createElement("div");
        this.bodyElement.classList.add("scope-body-highlight");
        this.bodyElement.style.backgroundColor = "rgba(75, 200, 255, 0.1)";

        this.updateDimensions();

        document.querySelector(editorDomElementClass).appendChild(this.headerElement);
        document.querySelector(editorDomElementClass).appendChild(this.bodyElement);
    }

    /**
     * Update the dimensions of this visual element. Called when the code construct
     * visual is attached to is updated in some way (moved, inserted into, etc...)
     */
    protected updateDimensions(): void {
        const headerDim = LineDimension.compute(this.statement, this.editor);

        let maxRight = headerDim.right;
        let maxLineNumber = 0;

        const stack = Array<Statement>();
        stack.unshift(...this.statement.body);

        while (stack.length > 0) {
            const line = stack.pop();

            const lineDim = LineDimension.compute(line, this.editor);
            if (lineDim.right > maxRight) maxRight = lineDim.right;
            if (line.lineNumber > maxLineNumber) maxLineNumber = line.lineNumber;

            if (line.hasBody()) stack.unshift(...line.body);
        }

        this.headerElement.style.top = `${headerDim.top}px`;
        this.headerElement.style.left = `${headerDim.left}px`;

        this.headerElement.style.width = `${maxRight - headerDim.left}px`;
        this.headerElement.style.height = `${headerDim.height}px`;

        let firstLineInBody = this.statement.body[0];
        let firstLineInBodyDim: LineDimension;

        if (firstLineInBody) {
            firstLineInBodyDim = LineDimension.compute(firstLineInBody, this.editor);
        } else {
            firstLineInBodyDim = LineDimension.compute(this.statement, this.editor);
        }

        this.bodyElement.style.top = `${firstLineInBodyDim.top}px`;
        this.bodyElement.style.left = `${firstLineInBodyDim.left}px`;

        this.bodyElement.style.width = `${maxRight - firstLineInBodyDim.left}px`;
        this.bodyElement.style.height = `${headerDim.height * (maxLineNumber - this.statement.lineNumber)}px`;
    }

    getHeaderElement(): HTMLDivElement {
        return this.headerElement;
    }

    getBodyElement(): HTMLDivElement {
        return this.bodyElement;
    }
}

export class LineDimension {
    top: number;
    left: number;
    right: number;
    width: number;
    height: number;

    constructor(top: number, left: number, right: number, width: number, height: number) {
        this.top = top;
        this.left = left;
        this.right = right;
        this.width = width;
        this.height = height;
    }

    static compute(code: Statement, editor: Editor): LineDimension {
        let lineNumber = code.getLineNumber();

        const text = code.getLineText();
        const transform = editor.computeBoundingBox(code.getSelection());

        let top = (code.getSelection().startLineNumber - 1) * editor.computeCharHeight();
        let left = (code.left - 1) * 10.5;
        let height = Math.floor(editor.computeCharHeight());
        let width = text.length * editor.computeCharWidthInvisible(lineNumber);
        let right = left + width;

        return new LineDimension(top, left, right, width, height);
    }

    toString(): string {
        return `top: ${this.top}, left: ${this.left}, right: ${this.right}, width: ${this.width}, height: ${this.height}`;
    }
}
