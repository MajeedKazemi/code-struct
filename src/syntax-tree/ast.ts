import * as monaco from "monaco-editor";
import { EventRouter } from "../editor/event-router";
import { TAB_SPACES } from "./keywords";
import { Editor } from "../editor/editor";
import { EventStack as EventStack } from "../editor/event-stack";
import { NotificationSystemController } from "../notification-system/notification-system-controller";
import { ErrorMessage } from "../notification-system/error-msg-generator";
import { HoverNotification, Notification } from "../notification-system/notification";
import { MenuController } from "../suggestions/suggestions-controller";
import { constructKeys, ConstructKeys, constructToToolboxButton, Util, hasMatch} from "../utilities/util";
import { Focus, Context, UpdatableContext } from "../editor/focus";
import { Hole } from "../editor/hole";
import { Validator } from "../editor/validator";
import { ActionExecutor } from "../editor/action-executor";
import { TypeSystem } from "./type-sys";

//Constants
const draftModeLineClassname = "draftModeLine"
const editorElementId = ".lines-content.monaco-editor-background"




export class Callback {
    static counter: number;
    callback: () => any;
    callerId: string;

    constructor(callback: () => any) {
        this.callback = callback;
        this.callerId = "caller-id-" + Callback.counter;
        Callback.counter++;
    }
}

export enum InsertionType{
    Valid,         //insertion can be made
    Invalid,       //insertion cannot be made
    DraftMode,     //insertion will trigger draft mode

}

export enum DataType {
    Number = "Number",
    Boolean = "Boolean",
    String = "String",
    Fractional = "Float",
    Iterator = "Iterator",
    AnyList = "ListAny",
    Set = "Set",
    Dict = "Dict",
    Class = "Class",
    Void = "Void",
    Any = "Any",

    //TODO: If there is ever time then DataType needs to be changed to a class to support nested types like these.
    //There are cases where we want to know what is inside the list such as for for-loop counter vars. They need to know
    //what they are iterating over otherwise no type can be assigned to them
    NumberList = "ListInt",
    BooleanList = "ListBool",
    StringList = "ListStr",
}

export enum BinaryOperator {
    Add = "+",
    Subtract = "-",
    Multiply = "*",
    Divide = "/",
    Mod = "%",
    Pow = "**",
    LeftShift = "<<",
    RightShift = ">>",
    BitOr = "|",
    BitXor = "^",
    BitAnd = "&",
    FloorDiv = "//",
}

export enum UnaryOp {
    Invert = "~",
    Not = "not",
    UAdd = "+",
    USub = "-",
}

export enum BoolOperator {
    And = "and",
    Or = "or",
}

export enum ComparatorOp {
    Equal = "==",
    NotEqual = "!=",
    LessThan = "<",
    LessThanEqual = "<=",
    GreaterThan = ">",
    GreaterThanEqual = ">=",
    Is = "is",
    IsNot = "is not",
    In = "in",
    NotIn = "not in",
}

export enum AddableType {
    NotAddable,

    Statement = "Statement",
    Expression = "Expression",
    ExpressionModifier = "Expression Modifier",
    Identifier = "Identifier",
    NumberLiteral = "Number Literal",
    StringLiteral = "String Literal",
}

export enum CallbackType {
    change,
    replace,
    delete,
    fail,
    focusEditableHole,
    showAvailableVars,
}

export interface CodeConstruct {
    /**
     * Indicates whether this code-construct implements the TextEditable interface or not.
     */
    isTextEditable: boolean;

    /**
     * The parent/root node for this code-construct. Statements are the only code construct that could have the Module as their root node.
     */
    rootNode: CodeConstruct | Module;

    /**
     * The index this item has inside its root's body (if root is the Module), or its tokens array.
     */
    indexInRoot: number;

    /**
     * Different types of edits when adding this statement/expression/token.
     */
    receives: Array<AddableType>;

    /**
     * The left column position of this code-construct.
     */
    left: number;

    /**
     * The right column position of this code-construct.
     */
    right: number;

    /**
     * Determines if this code-construct could be added (either from the toolbox or the autocomplete or elsewhere) to the program, and the type it accepts.
     */
    addableType: AddableType;

    /**
     * A warning or error notification for this code construct. (null if there are no notifications)
     */
    notification: Notification;

    /**
     * Whether this code construct is in draft mode or not. Always false for Tokens
     */
    draftModeEnabled: boolean;

    draftRecord: DraftRecord;


    /**
     * Builds the left and right positions of this node and all of its children nodes recursively.
     * @param pos the left position to start building the nodes from
     * @returns the final right position of the whole node (calculated after building all of the children nodes)
     */
    build(pos: monaco.Position): monaco.Position;

    /**
     * Traverses the AST starting from this node to locate the smallest code construct that matches the given position
     * @param pos The 2D point to start searching for
     * @returns The located code construct (which includes its parents)
     */
    locate(pos: monaco.Position): CodeConstruct;

    /**
     * Checks if this node contains the given position (as a 2D point)
     * @param pos the 2D point to check
     * @returns true: contains, false: does not contain
     */
    contains(pos: monaco.Position): boolean;

    /**
     * Finds and returns the next empty hole (name or value) in this code construct
     * @returns The found empty token or null (if nothing it didn't include any empty tokens)
     */
    getInitialFocus(): UpdatableContext;

    /**
     * Returns the textual value of the code construct (joining internal tokens for expressions and statements)
     */
    getRenderText(): string;

    /**
     * Returns the line number of this code-construct in the rendered text.
     */
    getLineNumber(): number;

    /**
     * Returns the left-position `(lineNumber, column)` of this code-construct in the rendered text.
     */
    getLeftPosition(): monaco.Position;

    /**
     * Returns a `Selection` object for this particular code-construct when it is selected
     */
    getSelection(): monaco.Selection;

    /**
     * Returns the parent statement of this code-construct (an element of the Module.body array).
     */
    getParentStatement(): Statement;

    /**
     * Subscribes a callback to be fired when the this code-construct is changed (could be a change in its children tokens or the body)
     */
    subscribe(type: CallbackType, callback: Callback);

    /**
     * Removes all subscribes of the given type for this code construct
     */
    unsubscribe(type: CallbackType, callerId: string);

    /**
     * Calls callback of the given type if this construct is subscribed to it.
     */
    notify(type: CallbackType);

    /**
     * Determine whether insertCode can be inserted into a hole belonging to the expression/statement this call was made from.
     * Optionally creates a warning in the editor in case of a type mismatch between insertCode and insertInto if enableWarnings is set to true. 
     * 
     * @param insertCode     code being inserted
     * @param enableWarnings determines whether a warning is created or not in case of a type mismatch
     * @param insertInto     hole being inserted into
     * @param notifSystem    this module's notification system object
     * 
     * @returns True if insertCode's type is accepted by insertInto according to what the parent of insertInto is. Returns False otherwise.
     */
    typeValidateInsertionIntoHole(insertCode: Expression, enableWarnings: boolean, insertInto?: TypedEmptyExpr, notifSystem?: NotificationSystemController): boolean;

    /**
     * Updates to be performed when a 
     * 
     * @param insertInto 
     * @param insertCode 
     */
    performPostInsertionUpdates(insertInto?: TypedEmptyExpr, insertCode?: Expression): void;

    performPreInsertionUpdates(insertInto?: TypedEmptyExpr, insertCode?: Expression) : void;
}

/**
 * A complete code statement such as: variable assignment, function call, conditional, loop, function definition, and other statements.
 */
export abstract class Statement implements CodeConstruct {
    isTextEditable = false;
    addableType: AddableType;
    receives = new Array<AddableType>();
    lineNumber: number;
    left: number;
    right: number;
    rootNode: CodeConstruct | Module = null;
    indexInRoot: number;
    body = new Array<Statement>();
    scope: Scope = null;
    tokens = new Array<CodeConstruct>();
    hasEmptyToken: boolean;
    callbacks = new Map<string, Array<Callback>>();
    notification = null;
    keywordIndex = -1;
    hole = null;
    typeOfHoles = new Map<number, Array<DataType>>();
    draftModeEnabled = false;
    draftRecord: DraftRecord = null;

    constructor() {
        for (const type in CallbackType) this.callbacks[type] = new Array<Callback>();
    }

    /**
     * The lineNumbers from the beginning to the end of this statement.
     */
    getHeight(): number {
        if (this.body.length == 0) return 1;
        else {
            let height = 1;

            for (const line of this.body) height += line.getHeight();

            return height;
        }
    }

    /**
     * This should be true for every statement that has a body.
     */
    hasScope(): boolean {
        return this.scope != null;
    }

    hasBody(): boolean {
        return this.body.length > 0;
    }

    toString(): string {
        let text = "";

        for (const token of this.tokens) text += token.getRenderText();

        return text;
    }

    setLineNumber(lineNumber: number) {
        this.lineNumber = lineNumber;

        if (this instanceof EmptyLineStmt) this.notify(CallbackType.change);

        for (const token of this.tokens) {
            if (token instanceof Expression) token.setLineNumber(lineNumber);
            (token as Token).notify(CallbackType.change);
        }
    }

    subscribe(type: CallbackType, callback: Callback) {
        this.callbacks[type].push(callback);
    }

    unsubscribe(type: CallbackType, callerId: string) {
        let index = -1;

        for (let i = 0; i < this.callbacks[type].length; i++) {
            if (this.callbacks[type].callerId == callerId) {
                index = i;
                break;
            }
        }

        if (index > 0) this.callbacks[type].splice(index, 1);
    }

    notify(type: CallbackType) {
        for (const callback of this.callbacks[type]) callback.callback();
    }

    rebuildBody(fromIndex: number, startLineNumber: number) {
        let lineNumber = startLineNumber;

        for (let i = fromIndex; i < this.body.length; i++) {
            this.body[i].indexInRoot = i;

            if (i == 0) {
                this.setLineNumber(lineNumber);
                lineNumber++;
            }

            if (this.body[i].hasBody()) this.body[i].rebuildBody(0, lineNumber);
            else this.body[i].setLineNumber(lineNumber);

            lineNumber += this.body[i].getHeight();
        }

        // propagate the rebuild-body process to the root node
        if (this.rootNode instanceof Module) {
            this.rootNode.rebuildBody(this.indexInRoot + 1, lineNumber);
        } else if (this.rootNode instanceof Statement && this.rootNode.hasBody()) {
            this.rootNode.rebuildBody(this.indexInRoot + 1, lineNumber);
        }
    }

    init(pos: monaco.Position) {
        this.build(pos);

        if (this.hasBody())
            for (let i = 0; i < this.body.length; i++)
                this.body[i].build(new monaco.Position(pos.lineNumber + i + 1, pos.column + TAB_SPACES));
    }

    build(pos: monaco.Position): monaco.Position {
        this.lineNumber = pos.lineNumber;
        this.left = pos.column;

        var curPos = pos;

        for (const token of this.tokens) curPos = token.build(curPos);

        this.right = curPos.column;

        this.notify(CallbackType.change);

        return curPos;
    }

    /**
     * Rebuilds the left and right positions of this node recursively. Optimized to not rebuild untouched nodes.
     * @param pos the left position to start building the nodes from
     * @param fromIndex the index of the node that was edited.
     */
    rebuild(pos: monaco.Position, fromIndex: number) {
        let curPos = pos;

        // rebuild siblings:
        for (let i = fromIndex; i < this.tokens.length; i++) {
            if (this.tokens[i] instanceof Token) curPos = this.tokens[i].build(curPos);
            else curPos = (this.tokens[i] as Expression).build(curPos);
        }

        this.right = curPos.column;

        if (this.rootNode != undefined && this.indexInRoot != undefined) {
            if (
                (this.rootNode instanceof Expression || this.rootNode instanceof Statement) &&
                this.rootNode.lineNumber == this.lineNumber
            ) {
                this.rootNode.rebuild(curPos, this.indexInRoot + 1);
            }
        } else console.warn("node did not have rootNode or indexInRoot: ", this.tokens);

        this.notify(CallbackType.change);
    }

    contains(pos: monaco.Position): boolean {
        if (this.lineNumber == pos.lineNumber && pos.column >= this.left && pos.column <= this.right) return true;

        return false;
    }

    getContainingSingleLineStatement(pos: monaco.Position): Statement {
        if (this.contains(pos)) return this;
        else {
            for (const line of this.body) {
                const stmt = line.getContainingSingleLineStatement(pos);

                if (stmt != null) return stmt;
            }
        }

        return null;
    }

    getStatementAtLine(line: number): Statement {
        let foundStmt: Statement = null;

        if (this.lineNumber == line) return this;
        else if (this.hasBody())
            for (const stmt of this.body) {
                foundStmt = stmt.getStatementAtLine(line);

                if (foundStmt != null) return foundStmt;
            }

        return null;
    }

    locate(pos: monaco.Position): CodeConstruct {
        if (pos.lineNumber == this.lineNumber) {
            if (pos.column == this.left) return this.tokens[0];
            else if (pos.column == this.right) return this.tokens[this.tokens.length - 1];
        }

        if (this.contains(pos)) for (const code of this.tokens) if (code.contains(pos)) return code.locate(pos);

        return null;
    }

    getInitialFocus(): UpdatableContext {
        for (let token of this.tokens) {
            if (token instanceof Token && token.isEmpty) return { tokenToSelect: token };
            else {
                let expr = token as Expression;

                if (expr.hasEmptyToken) return expr.getInitialFocus();
            }
        }

        return { positionToMove: new monaco.Position(this.getLineNumber(), this.right) };
    }

    /**
     * This function should be called after replacing a token within this statement. it checks if the newly added token `isEmpty` or not, and if yes, it will set `hasEmptyToken = true`
     * @param code the newly added node within the replace function
     */
    updateHasEmptyToken(code: CodeConstruct) {
        if (code instanceof Token) {
            if (code.isEmpty) this.hasEmptyToken = true;
            else this.hasEmptyToken = false;
        }
    }

    /**
     * Replaces this node in its root, and then rebuilds the parent (recursively)
     * @param code the new code-construct to replace
     * @param index the index to replace at
     */
    replace(code: CodeConstruct, index: number) {
        // Notify the token being replaced
        const toReplace = this.tokens[index];
        if (toReplace) {
            toReplace.notify(CallbackType.delete);

            if (!(toReplace instanceof Token)) {
                (toReplace as Statement).tokens.forEach((token) => {
                    if (token instanceof Token) {
                        token.notify(CallbackType.delete);
                    }
                });
            }
        }

        // prepare the new Node
        code.rootNode = this;
        code.indexInRoot = index;

        // prepare to rebuild siblings and root (recursively)
        let rebuildColumn: number;

        if (this.tokens[index] instanceof Token) rebuildColumn = this.tokens[index].left;
        else rebuildColumn = (this.tokens[index] as Expression).left;

        // replace
        //TODO: Update focus here? It is good up until now. But once the new construct is inserted, it is not being focused.
        //The focus goes to the end of line
        this.tokens[index] = code;

        if (rebuildColumn) this.rebuild(new monaco.Position(this.lineNumber, rebuildColumn), index);

        this.updateHasEmptyToken(code);

        this.notify(CallbackType.replace);
    }

    /**
     * Replaced the given item with the item in `this.body[index]`
     */
    replaceInBody(index: number, newStmt: Statement) {
        const curLeftPos = this.body[index].getLeftPosition();
        newStmt.init(curLeftPos);

        newStmt.rootNode = this.body[index].rootNode;
        newStmt.indexInRoot = index;
        this.body[index] = newStmt;

        if (newStmt.hasScope()) newStmt.scope.parentScope = this.scope;

        if (newStmt instanceof VarAssignmentStmt) {
            this.getModule().addVariableButtonToToolbox(newStmt);
            this.scope.references.push(new Reference(newStmt, this.scope));
        }

        if (newStmt instanceof ForStatement) {
            const varAssignStmt = new VarAssignmentStmt("", newStmt);
            varAssignStmt.lineNumber = newStmt.lineNumber;
            newStmt.buttonId = varAssignStmt.buttonId;

            newStmt.loopVar = varAssignStmt;

            this.getModule().addVariableButtonToToolbox(varAssignStmt);
            newStmt.scope.references.push(new Reference(varAssignStmt, this.scope));
        }

        this.rebuildBody(index + 1, curLeftPos.lineNumber + newStmt.getHeight());

        this.notify(CallbackType.replace);
    }

    /**
     * Adds `code` to the body at the given index
     * @param statement the statement to be added
     * @param index the index to add the `code` statement
     */
    addStatement(statement: Statement, index: number, lineNumber: number) {
        // TODO: update-body-index -> merge these two in to another function that would take care of the indexInRoot itself.
        // support delete, add, and etc.
        this.body.splice(index, 0, statement);
        for (let i = index + 1; i < this.body.length; i++) this.body[i].indexInRoot++;

        this.rebuildBody(index + 1, lineNumber + statement.getHeight());
        this.notify(CallbackType.change);
    }

    getRenderText(): string {
        let leftPosToCheck = 1;
        let txt: string = "";
        let textToAdd = "\n";

        for (const token of this.tokens) txt += token.getRenderText();

        if (this.hasBody()) {
            leftPosToCheck = this.left + TAB_SPACES - 1;

            if (leftPosToCheck != 1) for (let i = 0; i < leftPosToCheck; i++) textToAdd += " ";
        }

        for (const stmt of this.body) txt += textToAdd + stmt.getRenderText();

        return txt;
    }

    getLineNumber(): number {
        return this.lineNumber;
    }

    getLeftPosition(): monaco.Position {
        return new monaco.Position(this.getLineNumber(), this.left);
    }

    getSelection(): monaco.Selection {
        return new monaco.Selection(this.lineNumber, this.right, this.lineNumber, this.left);
    }

    getParentStatement(): Statement {
        return this;
    }

    /**
     * Returns the Module
     * @returns the parent module of the whole system
     */
    getModule(): Module {
        if (this.rootNode instanceof Module) return this.rootNode;

        return (this.rootNode as Statement).getModule();
    }

    getRootBody(): Array<Statement> {
        if (this.rootNode instanceof Module) this.rootNode.body;
        else if (this.rootNode instanceof Statement && this.rootNode.hasBody()) return this.rootNode.body;

        throw Error("Statement must have a root body.");
    }

    getNextLine(): Statement {
        let rootBody = this.getRootBody();

        if (this.indexInRoot + 1 < rootBody.length) return rootBody[this.indexInRoot + 1];
        else return null;
    }

    getPrevLine(): Statement {
        let rootBody = this.getRootBody();

        if (this.indexInRoot - 1 > 0) return rootBody[this.indexInRoot - 1];
        else return null;
    }

    /**
     * Return this statement's keyword if it has one. Otherwise return an empty string.
     *
     * @returns text representation of statement's keyword or an empty string if it has none
     */
    getKeyword(): string {
        if (this.keywordIndex > -1) return (this.tokens[this.keywordIndex] as KeywordTkn).text;

        return "";
    }

    typeValidateInsertionIntoHole(insertCode: Expression, enableWarnings: boolean, insertInto?: TypedEmptyExpr, notifSystem?: NotificationSystemController): boolean{
        return  insertInto.type.indexOf(insertCode.returns) > -1 || 
                insertInto.type.indexOf(DataType.Any) > -1;
    }

    performPostInsertionUpdates(insertInto?: TypedEmptyExpr, insertCode?: Expression){}

    performPreInsertionUpdates(insertInto?: TypedEmptyExpr, insertCode?: Expression){}
}

/**
 * A statement that returns a value such as: binary operators, unary operators, function calls that return a value, literal values, and variables.
 */
export abstract class Expression extends Statement implements CodeConstruct {
    isTextEditable = false;
    addableType: AddableType;
    // TODO: can change this to an Array to enable type checking when returning multiple items
    returns: DataType;

    constructor(returns: DataType) {
        super();

        this.returns = returns;
    }

    isStatement(): boolean {
        return this.returns == DataType.Void;
    }

    getLineNumber(): number {
        if (this.isStatement()) return this.lineNumber;
        else if (this.rootNode instanceof Statement) return this.rootNode.getLineNumber();
        else if(this.rootNode instanceof Expression) return (this.rootNode).getLineNumber();
    }

    getSelection(): monaco.Selection {
        const line = this.lineNumber >= 0 ? this.lineNumber : this.getLineNumber();

        return new monaco.Selection(line, this.right, line, this.left);
    }

    getParentStatement(): Statement {
        if (this.isStatement()) return this as Statement;
        else if (this.rootNode instanceof Statement && !(this.rootNode instanceof Expression)) return this.rootNode;
        else if (this.rootNode instanceof Expression) return this.rootNode.getParentStatement();
    }

    typeValidateInsertionIntoHole(insertCode: Expression, enableWarnings: boolean, insertInto?: TypedEmptyExpr, notifSystem?: NotificationSystemController): boolean{
        return super.typeValidateInsertionIntoHole(insertCode, enableWarnings, insertInto);
    }

    updateReturnType(insertCode: Expression){}
}

/**
 * The smallest code construct: identifiers, holes (for either identifiers or expressions), operators and characters, and etc.
 */
export abstract class Token implements CodeConstruct {
    isTextEditable = false;
    addableType: AddableType;
    rootNode: CodeConstruct = null;
    indexInRoot: number;
    receives = new Array<AddableType>();
    left: number;
    right: number;
    text: string;
    isEmpty: boolean = false;
    callbacks = new Map<string, Array<Callback>>();
    notification = null;
    draftModeEnabled = false;
    draftRecord = null;

    constructor(text: string, root?: CodeConstruct) {
        for (const type in CallbackType) this.callbacks[type] = new Array<Callback>();

        this.rootNode = root;
        this.text = text;
    }

    subscribe(type: CallbackType, callback: Callback) {
        this.callbacks[type].push(callback);
    }

    unsubscribe(type: CallbackType, callerId: string) {
        let index = -1;

        for (let i = 0; i < this.callbacks[type].length; i++) {
            if (this.callbacks[type].callerId == callerId) {
                index = i;

                break;
            }
        }

        if (index > 0) this.callbacks[type].splice(index, 1);
    }

    notify(type: CallbackType) {
        for (const callback of this.callbacks[type]) callback.callback();
    }

    /**
     * Builds the left and right positions of this token based on its text length.
     * @param pos the left position to start building this node's right position.
     * @returns the final right position of this node: for tokens it equals to `this.left + this.text.length - 1`
     */
    build(pos: monaco.Position): monaco.Position {
        this.left = pos.column;

        if (this.text.length == 0) {
            console.warn(
                "do not use any Tokens with no textual length (i.e. all tokens should take some space in the editor)."
            );
            this.right = pos.column;
        } else this.right = pos.column + this.text.length;

        this.notify(CallbackType.change);

        if (this.text.length == 0) return new monaco.Position(pos.lineNumber, this.right);
        else return new monaco.Position(pos.lineNumber, this.right);
    }

    /**
     * Checks if this node contains the given position (as a 2D point)
     * @param pos the 2D point to check
     * @returns true: contains, false: does not contain
     */
    contains(pos: monaco.Position): boolean {
        if (pos.column >= this.left && pos.column <= this.right) return true;

        return false;
    }

    /**
     * For this token element, it returns it self.
     * @param pos Not used
     * @returns This token
     */
    locate(pos: monaco.Position): CodeConstruct {
        return this;
    }

    /**
     * Finds and returns the next empty hole (name or value) in this code construct
     * @returns The found empty token or null (if nothing it didn't include any empty tokens)
     */
    getInitialFocus(): UpdatableContext {
        if (this.isEmpty) return { tokenToSelect: this };

        return { positionToMove: new monaco.Position(this.getLineNumber(), this.right) };
    }

    getRenderText(): string {
        return this.text;
    }

    getLineNumber(): number {
        if (this.rootNode instanceof Statement) return this.rootNode.getLineNumber();
        else return (this.rootNode as Expression).getLineNumber();
    }

    getLeftPosition(): monaco.Position {
        return new monaco.Position(this.getLineNumber(), this.left);
    }

    getSelection(): monaco.Selection {
        const line = this.getLineNumber();

        return new monaco.Selection(line, this.right, line, this.left);
    }

    getParentStatement(): Statement {
        if (
            (this.rootNode instanceof Statement && !(this.rootNode instanceof Expression)) ||
            (this.rootNode instanceof Expression && this.rootNode.isStatement())
        ) {
            return this.rootNode as Statement;
        } else if (this.rootNode instanceof Expression) return this.rootNode.getParentStatement();
    }

    typeValidateInsertionIntoHole(insertCode: Expression, enableWarnings: boolean, insertInto?: TypedEmptyExpr, notifSystem?: NotificationSystemController): boolean{
        return false;
    }

    performPostInsertionUpdates(insertInto?: TypedEmptyExpr, insertCode?: Expression){
        return;
    }

    performPreInsertionUpdates(insertInto?: TypedEmptyExpr, insertCode?: Expression){}
}

/**
 * Anything that implements these, can be edited with the keyboard
 */
export interface TextEditable {
    /**
     * The Regex used for validating this code-construct.
     */
    validatorRegex: RegExp;

    /**
     * Returns the editable portion of the element's text that could be edited later.
     */
    getEditableText(): string;

    /**
     * Returns the token's left column
     */
    getLeft(): number;

    /**
     * checks if the newly updated string could be set (using a Regex) and rebuilds the item if possible and returns `true`, o.w. returns `false`.
     * @param text the updated string to be set to this element.
     */
    setEditedText(text: string): boolean;
}

export class WhileStatement extends Statement {
    addableType = AddableType.Statement;
    scope: Scope;
    private conditionIndex: number;

    constructor(root?: CodeConstruct | Module, indexInRoot?: number) {
        super();

        this.tokens.push(new NonEditableTkn("while ", this, this.tokens.length));
        this.conditionIndex = this.tokens.length;
        this.tokens.push(new TypedEmptyExpr([DataType.Boolean], this, this.tokens.length));
        this.typeOfHoles[this.tokens.length - 1] = [DataType.Boolean];
        this.tokens.push(new NonEditableTkn(" :", this, this.tokens.length));

        this.body.push(new EmptyLineStmt(this, 0));
        this.scope = new Scope();

        this.hasEmptyToken = true;
    }

    replaceCondition(expr: Expression) {
        this.replace(expr, this.conditionIndex);
    }
}

export class IfStatement extends Statement {
    addableType = AddableType.Statement;
    private conditionIndex: number;

    constructor(root?: CodeConstruct | Module, indexInRoot?: number) {
        super();

        this.tokens.push(new NonEditableTkn("if ", this, this.tokens.length));
        this.conditionIndex = this.tokens.length;
        this.tokens.push(new TypedEmptyExpr([DataType.Boolean], this, this.tokens.length));
        this.typeOfHoles[this.tokens.length - 1] = [DataType.Boolean];
        this.tokens.push(new NonEditableTkn(" :", this, this.tokens.length));

        this.body.push(new EmptyLineStmt(this, 0));
        this.scope = new Scope();

        this.hasEmptyToken = true;
    }

    replaceCondition(expr: Expression) {
        this.replace(expr, this.conditionIndex);
    }

    isValidReference(uniqueId: string, lineNumber: number, indexInRoot: number): boolean {
        if (!(this.indexInRoot[indexInRoot] instanceof ElseStatement) && indexInRoot - 1 > 0) {
            for (let i = indexInRoot - 1; i >= 0; i--) {
                const stmt = this.body[i];

                if (stmt instanceof ElseStatement) break;
                if (stmt instanceof VarAssignmentStmt && uniqueId == stmt.buttonId) return true;
                if (stmt instanceof ForStatement && stmt.buttonId == uniqueId) return true;
            }
        }

        for (let stmt of this.scope.getValidReferences(this.getLineNumber()))
            if (
                (stmt.statement instanceof VarAssignmentStmt || stmt.statement instanceof ForStatement) &&
                uniqueId == stmt.statement.buttonId
            ) {
                return true;
            }

        return false;
    }

    isValidElseInsertion(index: number, statement: ElseStatement): boolean {
        if (statement.hasCondition) {
            // if there is an else before this elif => invalid
            for (let i = 0; i < index; i++) {
                const stmt = this.body[i];

                if (stmt instanceof ElseStatement && !stmt.hasCondition) return false;
            }
        } else {
            // if there is another else => invalid
            for (let stmt of this.body) if (stmt instanceof ElseStatement && !stmt.hasCondition) return false;

            // if the else is before an elif => invalid
            for (let i = index + 1; i < this.body.length; i++) {
                const stmt = this.body[i];

                if (stmt instanceof ElseStatement && stmt.hasCondition) return false;
            }
        }

        return true;
    }

    insertElseStatement(index: number, statement: ElseStatement) {
        const prevPos = this.body[index].getLeftPosition();

        // insert and shift other statements down
        // TODO: update-body-index ->
        this.body.splice(index, 0, statement);
        for (let i = index + 1; i < this.body.length; i++) this.body[i].indexInRoot++;

        // rebuild else statement, and body
        statement.init(new monaco.Position(prevPos.lineNumber, prevPos.column - TAB_SPACES));
        statement.rootNode = this;
        statement.indexInRoot = index;

        this.rebuildBody(index + 1, prevPos.lineNumber + 1);
    }

    typeValidateInsertionIntoHole(insertCode: Expression, enableWarnings: boolean, insertInto?: TypedEmptyExpr, notifSystem?: NotificationSystemController): boolean{
        const isValidType = super.typeValidateInsertionIntoHole(insertCode, enableWarnings, insertInto);

        if(enableWarnings && !isValidType){
           notifSystem.addStatementHoleTypeMismatchWarning(insertInto, insertCode);
        }

        return isValidType;
    }
}

export class ElseStatement extends Statement {
    rootNode: IfStatement;
    addableType = AddableType.Statement;
    private conditionIndex: number;
    hasCondition: boolean = false;

    constructor(hasCondition: boolean, root?: IfStatement, indexInRoot?: number) {
        super();
        this.hasCondition = hasCondition;

        if (hasCondition) {
            this.tokens.push(new NonEditableTkn("elif ", this, this.tokens.length));
            this.conditionIndex = this.tokens.length;
            this.tokens.push(new TypedEmptyExpr([DataType.Boolean], this, this.tokens.length));
            this.typeOfHoles[this.tokens.length - 1] = [DataType.Boolean];
            this.tokens.push(new NonEditableTkn(" :", this, this.tokens.length));
        } else this.tokens.push(new NonEditableTkn("else:", this, this.tokens.length));

        this.scope = new Scope();

        if (this.hasCondition) this.hasEmptyToken = true;
    }

    replaceCondition(expr: Expression) {
        if (this.hasCondition) this.replace(expr, this.conditionIndex);
    }
}

export class ForStatement extends Statement {
    addableType = AddableType.Statement;

    buttonId: string;
    private counterIndex: number;
    private rangeIndex: number;

    loopVar: VarAssignmentStmt = null;

    //TODO: Statements should not have a data type?
    dataType = DataType.Any;

    constructor(root?: CodeConstruct | Module, indexInRoot?: number) {
        super();

        this.tokens.push(new NonEditableTkn("for ", this, this.tokens.length));
        this.counterIndex = this.tokens.length;
        this.tokens.push(new IdentifierTkn(undefined, this, this.tokens.length));
        this.tokens.push(new NonEditableTkn(" in ", this, this.tokens.length));
        this.rangeIndex = this.tokens.length;
        this.tokens.push(
            new TypedEmptyExpr(
                [DataType.AnyList, DataType.StringList, DataType.NumberList, DataType.BooleanList, DataType.String],
                this,
                this.tokens.length
            )
        );
        this.typeOfHoles[this.tokens.length - 1] = [
            DataType.AnyList,
            DataType.StringList,
            DataType.NumberList,
            DataType.BooleanList,
            DataType.String,
        ];
        this.tokens.push(new NonEditableTkn(" :", this, this.tokens.length));

        this.body.push(new EmptyLineStmt(this, 0));
        this.body.push(new EmptyLineStmt(this, 1)); //TODO: Workaround for inability to navigate outside of an indented region and stay on the same line

        this.scope = new Scope();

        this.hasEmptyToken = true;
    }

    rebuild(pos: monaco.Position, fromIndex: number) {
        super.rebuild(pos, fromIndex);
        this.updateButton();
    }

    replaceCounter(expr: Expression) {
        this.replace(expr, this.counterIndex);
    }

    replaceRange(expr: Expression) {
        this.replace(expr, this.rangeIndex);
    }

    getIdentifier(): string {
        return this.tokens[this.counterIndex].getRenderText();
    }

    updateButton() {
        document.getElementById(this.buttonId).innerHTML = this.getIdentifier();
    }

    getIterableCodeObject(): CodeConstruct {
        return this.tokens[this.rangeIndex];
    }

    typeValidateInsertionIntoHole(insertCode: Expression, enableWarnings: boolean, insertInto?: TypedEmptyExpr, notifSystem?: NotificationSystemController): boolean{
        const isValidType = insertInto.type.indexOf(insertCode.returns) > -1;

        if(enableWarnings && !isValidType){
            notifSystem.addStatementHoleTypeMismatchWarning(insertInto, insertCode);
        }

        return isValidType;
    }
}

export class Argument {
    type: DataType[];
    name: string;
    isOptional: boolean;

    constructor(type: DataType[], name: string, isOptional: boolean) {
        this.type = type;
        this.name = name;
        this.isOptional = isOptional;
    }
}

export class EmptyLineStmt extends Statement {
    toString(): string {
        return "EmptyLine";
    }

    addableType = AddableType.Statement;
    hasEmptyToken = false;

    constructor(root?: CodeConstruct | Module, indexInRoot?: number) {
        super();

        this.receives.push(AddableType.Statement);

        this.rootNode = root;
        this.indexInRoot = indexInRoot;
    }

    build(pos: monaco.Position): monaco.Position {
        this.lineNumber = pos.lineNumber;
        this.left = this.right = pos.column;

        return new monaco.Position(this.lineNumber, this.right);
    }

    getInitialFocus(): UpdatableContext {
        return { positionToMove: this.getLeftPosition() };
    }

    getRenderText(): string {
        return "";
    }

    locate(pos: monaco.Position): CodeConstruct {
        return this;
    }
}

export class VarAssignmentStmt extends Statement {
    static uniqueId: number = 0;
    buttonId: string;
    addableType = AddableType.Statement;
    private identifierIndex: number;
    private valueIndex: number;
    dataType = DataType.Any;

    constructor(id?: string, root?: CodeConstruct | Module, indexInRoot?: number) {
        super();

        this.buttonId = "add-var-ref-" + VarAssignmentStmt.uniqueId;
        VarAssignmentStmt.uniqueId++;

        this.rootNode = root;
        this.indexInRoot = indexInRoot;

        this.identifierIndex = this.tokens.length;
        this.tokens.push(new IdentifierTkn(id, this, this.tokens.length));
        this.tokens.push(new NonEditableTkn(" = ", this, this.tokens.length));
        this.valueIndex = this.tokens.length;
        this.tokens.push(new TypedEmptyExpr([DataType.Any], this, this.tokens.length));
        this.typeOfHoles[this.tokens.length - 1] = [DataType.Any];

        this.hasEmptyToken = true;
    }

    replaceIdentifier(code: CodeConstruct) {
        this.replace(code, this.identifierIndex);
    }

    replaceValue(code: CodeConstruct) {
        this.replace(code, this.valueIndex);
    }

    rebuild(pos: monaco.Position, fromIndex: number) {
        super.rebuild(pos, fromIndex);

        this.updateButton();
    }

    getIdentifier(): string {
        return this.tokens[this.identifierIndex].getRenderText();
    }

    updateButton() {
        document.getElementById(this.buttonId).innerHTML = this.getIdentifier();
    }

    setIdentifier(identifier: string) {
        (this.tokens[this.identifierIndex] as IdentifierTkn).setIdentifierText(identifier);
    }
}

export class VariableReferenceExpr extends Expression {
    isEmpty = false;
    addableType = AddableType.Expression;
    identifier: string;
    uniqueId: string;

    constructor(id: string, returns: DataType, uniqueId: string, root?: CodeConstruct, indexInRoot?: number) {
        super(returns);

        const idToken = new NonEditableTkn(id);
        idToken.rootNode = this;
        idToken.indexInRoot = this.tokens.length;
        this.tokens.push(idToken);

        this.uniqueId = uniqueId;
        this.identifier = id;
        this.rootNode = root;
        this.indexInRoot = indexInRoot;
    }
}

export class FunctionCallStmt extends Expression {
    /**
     * function calls such as `print()` are single-line statements, while `randint()` are expressions and could be used inside a more complex expression, this should be specified when instantiating the `FunctionCallStmt` class.
     */
    private argumentsIndices = new Array<number>();
    addableType: AddableType;
    functionName: string = "";

    constructor(
        functionName: string,
        args: Array<Argument>,
        returns: DataType,
        root?: CodeConstruct | Module,
        indexInRoot?: number
    ) {
        super(returns);

        this.rootNode = root;
        this.indexInRoot = indexInRoot;
        this.functionName = functionName;

        if (this.isStatement()) this.addableType = AddableType.Statement;
        else this.addableType = AddableType.Expression;

        if (args.length > 0) {
            this.tokens.push(new NonEditableTkn(functionName + "(", this, this.tokens.length));

            // TODO: handle parenthesis in a better way (to be able to highlight the other when selecting one)

            for (let i = 0; i < args.length; i++) {
                let arg = args[i];

                this.argumentsIndices.push(this.tokens.length);
                this.tokens.push(new TypedEmptyExpr([...arg.type], this, this.tokens.length));
                this.typeOfHoles[this.tokens.length - 1] = [...arg.type];

                if (i + 1 < args.length) this.tokens.push(new NonEditableTkn(", ", this, this.tokens.length));
            }

            this.tokens.push(new NonEditableTkn(")", this, this.tokens.length));

            this.hasEmptyToken = true;
        } else this.tokens.push(new NonEditableTkn(functionName + "()", this, this.tokens.length));
    }

    replaceArgument(index: number, to: CodeConstruct) {
        this.replace(to, this.argumentsIndices[index]);
    }

    getFunctionName(): string {
        return this.functionName;
    }

    typeValidateInsertionIntoHole(insertCode: Expression, enableWarnings: boolean, insertInto?: TypedEmptyExpr, notifSystem?: NotificationSystemController): boolean{
        const isValidType = super.typeValidateInsertionIntoHole(insertCode, enableWarnings, insertInto);

        if(enableWarnings && !isValidType){
           notifSystem.addFunctionCallArgumentTypeMismatchWarning(insertInto, insertCode);
        }

        return isValidType;
    }
}

export class MethodCallExpr extends Expression {
    // onInsert => just check if focusedPos - 1 is an expression and has a correct returns data type
    // it will be added inside the prev expression

    private argumentsIndices = new Array<number>();
    private expressionIndex: number;
    addableType: AddableType;
    calledOn: DataType;

    constructor(
        functionName: string,
        args: Array<Argument>,
        returns: DataType,
        calledOn: DataType,
        root?: Expression,
        indexInRoot?: number
    ) {
        super(returns);

        this.calledOn = calledOn;
        this.rootNode = root;
        this.indexInRoot = indexInRoot;

        if (args.length > 0) this.hasEmptyToken = false;

        this.addableType = AddableType.ExpressionModifier;

        this.expressionIndex = this.tokens.length;
        this.tokens.push(new TypedEmptyExpr([DataType.Any], this, this.tokens.length));
        this.typeOfHoles[this.tokens.length - 1] = [DataType.Any];

        if (args.length > 0) {
            this.tokens.push(new NonEditableTkn("." + functionName + "(", this, this.tokens.length));

            for (let i = 0; i < args.length; i++) {
                let arg = args[i];

                this.argumentsIndices.push(this.tokens.length);
                this.tokens.push(new TypedEmptyExpr([...arg.type], this, this.tokens.length));
                this.typeOfHoles[this.tokens.length - 1] = [...arg.type];

                if (i + 1 < args.length) this.tokens.push(new NonEditableTkn(", ", this, this.tokens.length));
            }

            this.tokens.push(new NonEditableTkn(")", this, this.tokens.length));
        } else this.tokens.push(new NonEditableTkn("." + functionName + "()", this, this.tokens.length));
    }

    setExpression(prevItem: Expression) {
        this.replace(prevItem, this.expressionIndex);
    }

    replaceArgument(index: number, to: CodeConstruct) {
        this.replace(to, this.argumentsIndices[index]);
    }
}

export class ListElementAssignment extends Statement {
    constructor(root?: Expression, indexInRoot?: number) {
        super();

        this.rootNode = root;
        this.indexInRoot = indexInRoot;

        this.addableType = AddableType.Statement;

        this.tokens.push(
            new TypedEmptyExpr(
                [DataType.AnyList, DataType.NumberList, DataType.StringList, DataType.BooleanList],
                this,
                this.tokens.length
            )
        );
        this.typeOfHoles[this.tokens.length - 1] = [
            DataType.AnyList,
            DataType.NumberList,
            DataType.StringList,
            DataType.BooleanList,
        ];
        this.tokens.push(new NonEditableTkn("[", this, this.tokens.length));
        this.tokens.push(new TypedEmptyExpr([DataType.Number], this, this.tokens.length));
        this.typeOfHoles[this.tokens.length - 1] = [DataType.Number];
        this.tokens.push(new NonEditableTkn("] = ", this, this.tokens.length));
        //TODO: Python lists allow elements of different types to be added to the same list. Should we keep that functionality?
        this.tokens.push(new TypedEmptyExpr([DataType.Any], this, this.tokens.length));
        this.typeOfHoles[this.tokens.length - 1] = [DataType.Any];
    }
}

export class MethodCallStmt extends Statement {
    addableType: AddableType;
    private argumentsIndices = new Array<number>();

    constructor(functionName: string, args: Array<Argument>, root?: Expression, indexInRoot?: number) {
        super();

        this.rootNode = root;
        this.indexInRoot = indexInRoot;
        this.addableType = AddableType.Statement;

        if (args.length > 0) {
            this.hasEmptyToken = false;
            this.tokens.push(new NonEditableTkn("." + functionName + "(", this, this.tokens.length));

            for (let i = 0; i < args.length; i++) {
                let arg = args[i];

                this.argumentsIndices.push(this.tokens.length);
                this.tokens.push(new TypedEmptyExpr([...arg.type], this, this.tokens.length));
                this.typeOfHoles[this.tokens.length - 1] = [...arg.type];

                if (i + 1 < args.length) this.tokens.push(new NonEditableTkn(", ", this, this.tokens.length));
            }

            this.tokens.push(new NonEditableTkn(")", this, this.tokens.length));
        } else this.tokens.push(new NonEditableTkn("." + functionName + "()", this, this.tokens.length));
    }

    replaceArgument(index: number, to: CodeConstruct) {
        this.replace(to, this.argumentsIndices[index]);
    }
}

export class MemberCallStmt extends Expression {
    addableType = AddableType.Expression;
    operator: BinaryOperator;
    private rightOperandIndex: number;

    constructor(returns: DataType, root?: CodeConstruct, indexInRoot?: number) {
        super(returns);

        this.rootNode = root;
        this.indexInRoot = indexInRoot;

        this.addableType = AddableType.Expression;

        this.tokens.push(
            new TypedEmptyExpr(
                [DataType.AnyList, DataType.NumberList, DataType.StringList, DataType.BooleanList],
                this,
                this.tokens.length
            )
        );
        this.typeOfHoles[this.tokens.length - 1] = [
            DataType.AnyList,
            DataType.NumberList,
            DataType.StringList,
            DataType.BooleanList,
        ];
        this.tokens.push(new NonEditableTkn("[", this, this.tokens.length));
        this.rightOperandIndex = this.tokens.length;
        this.tokens.push(new TypedEmptyExpr([DataType.Number], this, this.tokens.length));
        this.typeOfHoles[this.tokens.length - 1] = [DataType.Number];
        this.tokens.push(new NonEditableTkn("]", this, this.tokens.length));

        this.hasEmptyToken = true;
    }
}

export class BinaryOperatorExpr extends Expression {
    addableType = AddableType.Expression;
    operator: BinaryOperator;
    private leftOperandIndex: number;
    private rightOperandIndex: number;

    constructor(operator: BinaryOperator, returns: DataType, root?: CodeConstruct, indexInRoot?: number) {
        super(returns);

        this.rootNode = root;
        this.indexInRoot = indexInRoot;
        this.operator = operator;

        this.addableType = AddableType.Expression;

        this.tokens.push(new NonEditableTkn("(", this, this.tokens.length));

        this.leftOperandIndex = this.tokens.length;
        if (operator == BinaryOperator.Add) {
            this.tokens.push(new TypedEmptyExpr([DataType.Number, DataType.String], this, this.tokens.length));
            this.typeOfHoles[this.tokens.length - 1] = [DataType.Number, DataType.String];
        } else {
            this.tokens.push(new TypedEmptyExpr([DataType.Number], this, this.tokens.length));
            this.typeOfHoles[this.tokens.length - 1] = [DataType.Number];
            this.returns = DataType.Number;
        }

        this.tokens.push(new NonEditableTkn(" " + operator + " ", this, this.tokens.length));

        this.rightOperandIndex = this.tokens.length;
        if (operator == BinaryOperator.Add) {
            this.tokens.push(new TypedEmptyExpr([DataType.Number, DataType.String], this, this.tokens.length));
            this.typeOfHoles[this.tokens.length - 1] = [DataType.Number, DataType.String];
        } else {
            this.tokens.push(new TypedEmptyExpr([DataType.Number], this, this.tokens.length));
            this.typeOfHoles[this.tokens.length - 1] = [DataType.Number];
            this.returns = DataType.Number;
        }

        this.tokens.push(new NonEditableTkn(")", this, this.tokens.length));

        this.hasEmptyToken = true;
    }

    replaceLeftOperand(code: CodeConstruct) {
        this.replace(code, this.leftOperandIndex);
    }

    replaceRightOperand(code: CodeConstruct) {
        this.replace(code, this.rightOperandIndex);
    }

    getLeftOperandIndex() {
        return this.leftOperandIndex;
    }

    getRightOperandIndex() {
        return this.rightOperandIndex;
    }

    //set both operands to return type and add it to type array if it is not there
    updateOperandTypes(type: DataType) {
        //in this case the type arrays will always only contain a single type unless it is the + operator
        const leftOperandTypes = (this.tokens[this.getLeftOperandIndex()] as TypedEmptyExpr).type;
        const rightOperandTypes = (this.tokens[this.getRightOperandIndex()] as TypedEmptyExpr).type;

        if (leftOperandTypes.indexOf(type) == -1) {
            leftOperandTypes.push(type);
        }

        if (rightOperandTypes.indexOf(type) == -1) {
            rightOperandTypes.push(type);
        }

        this.returns = type;
    }

    //remove type from operands' type arrays
    removeTypeFromOperands(type: DataType) {
        //in this case the type arrays will always only contain a single type unless it is the + operator
        const leftOperandTypes = (this.tokens[this.getLeftOperandIndex()] as TypedEmptyExpr).type;
        const rightOperandTypes = (this.tokens[this.getRightOperandIndex()] as TypedEmptyExpr).type;

        if (leftOperandTypes.indexOf(type) > -1) {
            leftOperandTypes.splice(leftOperandTypes.indexOf(type), 1);
        }

        if (rightOperandTypes.indexOf(type) > -1) {
            rightOperandTypes.splice(rightOperandTypes.indexOf(type), 1);
        }
    }

    performPreInsertionUpdates(insertInto?: TypedEmptyExpr, insertCode?: Expression){
        // Special case. + supports String and number and needs to be updated when it is inserted into a hole of one of those types
        if (this.operator === BinaryOperator.Add && 
            (insertInto.type.indexOf(DataType.String) > -1 ||
            insertInto.type.indexOf(DataType.Number) > -1)
        ) {
            this.returns = insertInto.type[0]; // it is safe to assume insertInto.type will have a single type because a hole cannot accept both Number and String
            this.updateOperandTypes(insertInto.type[0]);

            if (insertInto.type.indexOf(DataType.String) > -1) {
                this.removeTypeFromOperands(DataType.Number);
            } else this.removeTypeFromOperands(DataType.String);
        }
    }

    updateReturnType(insertCode: Expression){
        //Check if one of the holes is not empty and get its type
        let existingLiteralType = null;
        if (this.tokens[this.leftOperandIndex] instanceof Expression) {
            existingLiteralType = (
                this.tokens[this.leftOperandIndex] as Expression).returns;
        } else if (this.tokens[this.rightOperandIndex] instanceof Expression) {
            existingLiteralType = (
                this.tokens[this.rightOperandIndex] as Expression).returns;
        }

        //if existingLiteralType is null then both operands are still empty holes and since we are inserting 
        //into one of them, the types need to be updated
        if (
            !existingLiteralType &&
            (this.returns === DataType.Any || this.returns === DataType.Boolean)
        ) {
            this.returns = insertCode.returns;
            
            (this.tokens[this.leftOperandIndex] as TypedEmptyExpr).type = [insertCode.returns];
            (this.tokens[this.rightOperandIndex] as TypedEmptyExpr).type = [insertCode.returns];
        }
    }
}

export class UnaryOperatorExpr extends Expression {
    addableType = AddableType.Expression;
    operator: UnaryOp;
    private operandIndex: number;

    constructor(
        operator: UnaryOp,
        returns: DataType,
        operatesOn: DataType = DataType.Any,
        root?: CodeConstruct,
        indexInRoot?: number
    ) {
        super(returns);

        this.rootNode = root;
        this.indexInRoot = indexInRoot;
        this.operator = operator;

        this.addableType = AddableType.Expression;

        this.tokens.push(new NonEditableTkn("(" + operator + " ", this, this.tokens.length));
        this.operandIndex = this.tokens.length;
        this.tokens.push(new TypedEmptyExpr([operatesOn], this, this.tokens.length));
        this.typeOfHoles[this.tokens.length - 1] = [operatesOn];
        this.tokens.push(new NonEditableTkn(")", this, this.tokens.length));

        this.hasEmptyToken = true;
    }

    replaceOperand(code: CodeConstruct) {
        this.replace(code, this.operandIndex);
    }

    getKeyword(): string {
        return this.operator;
    }
}

export class BinaryBoolOperatorExpr extends Expression {
    addableType = AddableType.Expression;
    operator: BoolOperator;
    private leftOperandIndex: number;
    private rightOperandIndex: number;

    constructor(operator: BoolOperator, root?: CodeConstruct, indexInRoot?: number) {
        super(DataType.Boolean);

        this.rootNode = root;
        this.indexInRoot = indexInRoot;
        this.operator = operator;

        this.addableType = AddableType.Expression;

        this.leftOperandIndex = this.tokens.length;
        this.tokens.push(new NonEditableTkn("(", this, this.tokens.length));
        this.tokens.push(new TypedEmptyExpr([DataType.Boolean], this, this.tokens.length));
        this.typeOfHoles[this.tokens.length - 1] = [DataType.Boolean];
        this.tokens.push(new NonEditableTkn(" " + operator + " ", this, this.tokens.length));
        this.rightOperandIndex = this.tokens.length;
        this.tokens.push(new TypedEmptyExpr([DataType.Boolean], this, this.tokens.length));
        this.typeOfHoles[this.tokens.length - 1] = [DataType.Boolean];
        this.tokens.push(new NonEditableTkn(")", this, this.tokens.length));

        this.hasEmptyToken = true;
    }

    replaceLeftOperand(code: CodeConstruct) {
        this.replace(code, this.leftOperandIndex);
    }

    replaceRightOperand(code: CodeConstruct) {
        this.replace(code, this.rightOperandIndex);
    }

    typeValidateInsertionIntoHole(insertCode: Expression, enableWarnings: boolean, insertInto?: TypedEmptyExpr, notifSystem?: NotificationSystemController): boolean{
        const isValidType = insertCode.returns != DataType.Boolean;

        if(enableWarnings && !isValidType && !isValidType){
           notifSystem.addBinBoolOpOperandTypeMismatchWarning(insertInto, this.operator, insertCode);
        }

        return isValidType;
    }
}

export class ComparatorExpr extends Expression {
    addableType = AddableType.Expression;
    operator: ComparatorOp;
    private leftOperandIndex: number;
    private rightOperandIndex: number;

    constructor(operator: ComparatorOp, root?: CodeConstruct, indexInRoot?: number) {
        super(DataType.Boolean);

        this.rootNode = root;
        this.indexInRoot = indexInRoot;
        this.operator = operator;

        this.addableType = AddableType.Expression;

        this.tokens.push(new NonEditableTkn("(", this, this.tokens.length));
        this.leftOperandIndex = this.tokens.length;
        this.tokens.push(new TypedEmptyExpr([DataType.Any], this, this.tokens.length));
        this.typeOfHoles[this.tokens.length - 1] = [DataType.Any];
        this.tokens.push(new NonEditableTkn(" " + operator + " ", this, this.tokens.length));
        this.rightOperandIndex = this.tokens.length;
        this.tokens.push(new TypedEmptyExpr([DataType.Any], this, this.tokens.length));
        this.typeOfHoles[this.tokens.length - 1] = [DataType.Any];
        this.tokens.push(new NonEditableTkn(")", this, this.tokens.length));

        this.hasEmptyToken = true;
    }

    replaceLeftOperand(code: CodeConstruct) {
        this.replace(code, this.leftOperandIndex);
    }

    replaceRightOperand(code: CodeConstruct) {
        this.replace(code, this.rightOperandIndex);
    }

    //TODO: Why not just getLeftOperand(): CodeConstruct
    getLeftOperandIndex() {
        return this.leftOperandIndex;
    }

    getRightOperandIndex() {
        return this.rightOperandIndex;
    }

    updateReturnType(insertCode: Expression){
        //Check if one of the holes is not empty and get its type
        let existingLiteralType = null;
        if (this.tokens[this.leftOperandIndex] instanceof Expression) {
            existingLiteralType = (
                this.tokens[this.leftOperandIndex] as Expression).returns;
        } else if (this.tokens[this.rightOperandIndex] instanceof Expression) {
            existingLiteralType = (
                this.tokens[this.rightOperandIndex] as Expression).returns;
        }

        //if existingLiteralType is null then both operands are still empty holes and since we are inserting 
        //into one of them, the types need to be updated
        if (
            !existingLiteralType &&
            (this.returns === DataType.Any || this.returns === DataType.Boolean)
        ) {            
            (this.tokens[this.leftOperandIndex] as TypedEmptyExpr).type = [insertCode.returns];
            (this.tokens[this.rightOperandIndex] as TypedEmptyExpr).type = [insertCode.returns];
        }
    }
}

export class EditableTextTkn extends Token implements TextEditable {
    isTextEditable = true;
    validatorRegex: RegExp;

    constructor(text: string, regex: RegExp, root?: CodeConstruct, indexInRoot?: number) {
        super(text);

        this.rootNode = root;
        this.indexInRoot = indexInRoot;
        this.validatorRegex = regex;
    }

    getSelection(): monaco.Selection {
        const leftPos = this.getLeftPosition();

        return new monaco.Selection(
            leftPos.lineNumber,
            leftPos.column + this.text.length,
            leftPos.lineNumber,
            leftPos.column
        );
    }

    getLeft(): number {
        return this.left;
    }

    getEditableText(): string {
        return this.text;
    }

    setEditedText(text: string): boolean {
        if (this.validatorRegex.test(text)) {
            this.text = text;
            (this.rootNode as Expression).rebuild(this.getLeftPosition(), this.indexInRoot);

            return true;
        } else {
            this.notify(CallbackType.fail);
            return false;
        }
    }

    build(pos: monaco.Position): monaco.Position {
        this.left = pos.column;

        if (this.text.length == 0) {
            console.warn("Do not use any Tokens with 0 textual length.");
            this.right = pos.column;
        } else this.right = pos.column + this.text.length;

        this.notify(CallbackType.change);

        return new monaco.Position(pos.lineNumber, this.right);
    }
}

export class LiteralValExpr extends Expression {
    addableType = AddableType.Expression;
    allowedBinOps = new Array<BinaryOperator>();
    allowedBoolOps = new Array<BoolOperator>();

    constructor(returns: DataType, value?: string, root?: CodeConstruct, indexInRoot?: number) {
        super(returns);

        switch (returns) {
            case DataType.String: {
                this.tokens.push(new NonEditableTkn('"', this, this.tokens.length));
                this.tokens.push(
                    new EditableTextTkn(
                        value == undefined ? "" : value,
                        RegExp('^([^\\r\\n\\"]*)$'),
                        this,
                        this.tokens.length
                    )
                );
                this.tokens.push(new NonEditableTkn('"', this, this.tokens.length));

                this.allowedBinOps.push(BinaryOperator.Add);

                break;
            }

            case DataType.Number: {
                this.tokens.push(
                    new EditableTextTkn(
                        value == undefined ? "" : value,
                        RegExp("^(([+-][0-9]+)|(([+-][0-9]*)\\.([0-9]+))|([0-9]*)|(([0-9]*)\\.([0-9]*)))$"),
                        this,
                        this.tokens.length
                    )
                );

                this.allowedBinOps.push(BinaryOperator.Add);
                this.allowedBinOps.push(BinaryOperator.Subtract);
                this.allowedBinOps.push(BinaryOperator.Multiply);
                this.allowedBinOps.push(BinaryOperator.Divide);

                break;
            }

            case DataType.Boolean: {
                this.tokens.push(new NonEditableTkn(value, this, this.tokens.length));

                this.allowedBoolOps.push(BoolOperator.And);
                this.allowedBoolOps.push(BoolOperator.Or);

                break;
            }
        }

        this.rootNode = root;
        this.indexInRoot = indexInRoot;
    }

    getInitialFocus(): UpdatableContext {
        let newContext = new Context();

        switch (this.returns) {
            case DataType.String:
            case DataType.Number:
                return { positionToMove: new monaco.Position(this.lineNumber, this.left + 1) };

            case DataType.Boolean:
                return { positionToMove: new monaco.Position(this.lineNumber, this.right) };
        }
    }

    performPreInsertionUpdates(insertInto?: TypedEmptyExpr, insertCode?: Expression){
        if(insertInto.rootNode instanceof Expression){
            insertInto.rootNode.updateReturnType(this);
        }
    }
}

export class ListLiteralExpression extends Expression {
    addableType = AddableType.Expression;

    constructor(root?: CodeConstruct, indexInRoot?: number) {
        super(DataType.AnyList);

        this.rootNode = root;
        this.indexInRoot = indexInRoot;

        this.tokens.push(new NonEditableTkn("[", this, this.tokens.length));
        this.tokens.push(new TypedEmptyExpr([DataType.Any], this, this.tokens.length));
        this.typeOfHoles[this.tokens.length - 1] = [DataType.Any];
        this.tokens.push(new NonEditableTkn("]", this, this.tokens.length));

        this.hasEmptyToken = true;
    }

    updateReturnType(insertCode: Expression){
        if(this.areAllHolesEmpty()){
            this.returns = TypeSystem.getListTypeFromElementType(insertCode.returns);
        }
        else if(TypeSystem.getElementTypeFromListType(this.returns) !== insertCode.returns){
            this.returns = DataType.AnyList;
        }
    }

    //return whether all elements of this list are of type TypedEmptyExpr
    private areAllHolesEmpty(){
        const elements = this.tokens.filter(tkn => !(tkn instanceof NonEditableTkn));
        const numberOfElements = elements.length;
        const numberOfEmptyHoles = elements.filter(element => element instanceof TypedEmptyExpr).length;

        return numberOfEmptyHoles === numberOfElements
    }
}

export class IdentifierTkn extends Token implements TextEditable {
    isTextEditable = true;
    addableType = AddableType.Identifier;
    validatorRegex: RegExp;

    constructor(identifier?: string, root?: CodeConstruct, indexInRoot?: number) {
        super(identifier == undefined ? "   " : identifier);

        if (identifier == undefined) this.isEmpty = true;
        else this.isEmpty = false;

        this.rootNode = root;
        this.indexInRoot = indexInRoot;
        this.validatorRegex = RegExp("^[^\\d\\W]\\w*$");
    }

    contains(pos: monaco.Position): boolean {
        if (pos.column >= this.left && pos.column <= this.right) return true;

        return false;
    }

    getLeft(): number {
        return this.left;
    }

    getEditableText(): string {
        return this.text;
    }

    setEditedText(text: string): boolean {
        if (this.validatorRegex.test(text)) {
            this.setIdentifierText(text);
            (this.rootNode as Statement).rebuild(this.getLeftPosition(), this.indexInRoot);

            if (this.text.length > 0) this.isEmpty = false;
            if (this.text.length == 0) this.isEmpty = true;

            return true;
        } else {
            this.notify(CallbackType.fail);
            return false;
        }
    }

    setIdentifierText(text: string) {
        this.text = text;
    }
}

export class TypedEmptyExpr extends Token {
    isEmpty = true;
    type: DataType[];

    constructor(type: DataType[], root?: CodeConstruct, indexInRoot?: number) {
        super("   ");

        this.rootNode = root;
        this.indexInRoot = indexInRoot;
        this.type = type;

        this.receives.push(AddableType.Expression);
    }
}

export class OperatorTkn extends Token {
    operator: string = "";

    constructor(text: string, root?: CodeConstruct, indexInRoot?: number) {
        super(text);

        this.rootNode = root;
        this.indexInRoot = indexInRoot;
        this.operator = text;
    }

    locate(pos: monaco.Position): CodeConstruct {
        return this.rootNode;
    }

    getSelection(): monaco.Selection {
        return this.rootNode.getSelection();
    }
}

export class NonEditableTkn extends Token {
    constructor(text: string, root?: CodeConstruct, indexInRoot?: number) {
        super(text);

        this.rootNode = root;
        this.indexInRoot = indexInRoot;
    }

    locate(pos: monaco.Position): CodeConstruct {
        return this.rootNode;
    }

    getSelection(): monaco.Selection {
        return this.rootNode.getSelection();
    }
}

export class KeywordTkn extends Token {
    constructor(text: string, root?: CodeConstruct, indexInRoot?: number) {
        super(text);

        this.rootNode = root;
        this.indexInRoot = indexInRoot;
    }

    locate(pos: monaco.Position): CodeConstruct {
        return this.rootNode;
    }

    getSelection(): monaco.Selection {
        return this.rootNode.getSelection();
    }
}

/**
 * The main body of the code which includes an array of statements.
 */
export class Module {
    static draftModeButtonClass = "draftModeButton";

    body = new Array<Statement>();
    focus: Focus;
    validator: Validator;
    executer: ActionExecutor;

    scope: Scope;
    editor: Editor;
    eventRouter: EventRouter;
    eventStack: EventStack;
    variableButtons: HTMLDivElement[] = [];
    notificationSystem: NotificationSystemController;
    menuController: MenuController;
    typeSystem: TypeSystem;
    draftExpressions: DraftRecord[];

    constructor(editorId: string) {
        this.editor = new Editor(document.getElementById(editorId), this);
        this.focus = new Focus(this);
        this.validator = new Validator(this);
        this.executer = new ActionExecutor(this);
        this.typeSystem = new TypeSystem(this);

        this.draftExpressions = [];

        this.focus.subscribeCallback((c: Context) => {
            Hole.disableEditableHoleOutlines();
            Hole.disableVarHighlights();
            Hole.outlineTextEditableHole(c);
            Hole.highlightValidVarHoles(c);
        });

        //TODO: Don't know where functionality like this should go, but once we decide on that, it would be better to rafactor this one to
        //use methods like above code
        this.focus.subscribeCallback(
            ((c: Context) => {
                const focusedNode = c.token && c.selected ? c.token : c.lineStatement;
                const validInserts = this.getAllValidInsertsList(focusedNode);
                const validRefs = Validator.getValidVariableReferences(focusedNode);
                const validVarIds: string[] = validRefs.map(
                    (ref) => ((ref[0] as Reference).statement as VarAssignmentStmt).buttonId
                );

                //mark draft mode buttons
                this.updateDraftModeToolboxButtons(focusedNode, validInserts);
                this.updateDraftModeToolboxVarButtons(validRefs);

                //disable/enable toolbox construct buttons based on context
                Object.keys(ConstructKeys).forEach((construct) => {
                    if (constructToToolboxButton.has(ConstructKeys[construct])) {
                        const button = document.getElementById(
                            constructToToolboxButton.get(ConstructKeys[construct])
                        ) as HTMLButtonElement;

                        if (validInserts.indexOf(ConstructKeys[construct]) == -1) {
                            button.disabled = true;
                            button.classList.add("disabled");
                            button.classList.remove(Module.draftModeButtonClass)
                        } else {
                            button.disabled = false;
                            button.classList.remove("disabled");
                        }
                    }
                });

                //disable/enable toolbox var buttons based on context
                this.variableButtons.forEach((button) => {
                    if (validVarIds.indexOf(button.id) > -1) {
                        button.classList.remove("varButtonDisabled");
                    } else {
                        button.classList.add("varButtonDisabled");
                        button.classList.remove(Module.draftModeButtonClass)
                    }
                });
            }).bind(this)
        );

        this.focus.subscribeCallback((c: Context) => {
            const menuController = MenuController.getInstance();
            if (menuController.isMenuOpen()) menuController.removeMenus();
        });

        this.body.push(new EmptyLineStmt(this, 0));
        this.scope = new Scope();
        this.body[0].build(new monaco.Position(1, 1));

        this.focus.updateContext({ tokenToSelect: this.body[0] });
        this.editor.monaco.focus();

        this.eventRouter = new EventRouter(this);
        this.eventStack = new EventStack(this);

        this.notificationSystem = new NotificationSystemController(this.editor, this);

        this.variableButtons = [];

        this.menuController = MenuController.getInstance();
        this.menuController.setInstance(this, this.editor);
    }

    recursiveNotify(code: CodeConstruct, callbackType: CallbackType) {
        code.notify(callbackType)
        if (code instanceof Expression || code instanceof Statement) {
            const codeStack = new Array<CodeConstruct>();
            codeStack.unshift(...code.tokens);

            if (code instanceof Statement && code.hasBody()) codeStack.unshift(...code.body);

            while (codeStack.length > 0) {
                const curCode = codeStack.pop();
                curCode.notify(callbackType);

                if (curCode instanceof Statement || curCode instanceof Expression) codeStack.unshift(...curCode.tokens);
                if (curCode instanceof Statement && curCode.hasBody()) codeStack.unshift(...curCode.body);
            }
        }
    }

    indentBackStatement(line: Statement) {
        const root = line.rootNode;

        if (root instanceof Statement) {
            if (!line.hasBody()) {
                const removedItem = root.body.splice(line.indexInRoot, 1);

                let outerBody: Array<Statement>;

                if (root.rootNode instanceof Module) outerBody = root.rootNode.body;
                else if (root.rootNode instanceof Statement) outerBody = root.rootNode.body;

                removedItem[0].rootNode = root.rootNode;
                removedItem[0].indexInRoot = root.indexInRoot + 1;
                removedItem[0].build(new monaco.Position(line.lineNumber, line.left - TAB_SPACES));

                outerBody.splice(root.indexInRoot + 1, 0, ...removedItem);

                this.rebuildBody(0, 1);
            } else {
                const removedItem = root.body.splice(line.indexInRoot, 1);

                let outerBody: Array<Statement>;

                if (root.rootNode instanceof Module) outerBody = root.rootNode.body;
                else if (root.rootNode instanceof Statement) outerBody = root.rootNode.body;

                removedItem[0].rootNode = root.rootNode;
                removedItem[0].indexInRoot = root.indexInRoot + 1;
                removedItem[0].build(new monaco.Position(line.lineNumber, line.left - TAB_SPACES));

                const stmtStack = new Array<Statement>();
                stmtStack.unshift(...removedItem[0].body);

                while (stmtStack.length > 0) {
                    const curStmt = stmtStack.pop();
                    curStmt.build(new monaco.Position(curStmt.lineNumber, curStmt.left - TAB_SPACES));

                    if (curStmt.hasBody()) stmtStack.unshift(...curStmt.body);
                }

                outerBody.splice(root.indexInRoot + 1, 0, ...removedItem);

                this.rebuildBody(0, 1);
            }
        }
    }

    indentForwardStatement(line: Statement) {
        const root = line.rootNode;

        if (root instanceof Statement || root instanceof Module) {
            if (!line.hasBody()) {
                const aboveMultilineStmt = root.body[line.indexInRoot - 1];
                const removedItem = root.body.splice(line.indexInRoot, 1);

                removedItem[0].rootNode = aboveMultilineStmt;
                removedItem[0].indexInRoot = aboveMultilineStmt.body.length;
                removedItem[0].build(new monaco.Position(line.lineNumber, line.left + TAB_SPACES));

                aboveMultilineStmt.body.push(removedItem[0]);

                this.rebuildBody(0, 1);
            } else {
                const aboveMultilineStmt = root.body[line.indexInRoot - 1];
                const removedItem = root.body.splice(line.indexInRoot, 1);

                removedItem[0].rootNode = aboveMultilineStmt;
                removedItem[0].indexInRoot = aboveMultilineStmt.body.length;
                removedItem[0].build(new monaco.Position(line.lineNumber, line.left + TAB_SPACES));

                const stmtStack = new Array<Statement>();
                stmtStack.unshift(...removedItem[0].body);

                while (stmtStack.length > 0) {
                    const curStmt = stmtStack.pop();
                    curStmt.build(new monaco.Position(curStmt.lineNumber, curStmt.left + TAB_SPACES));

                    if (curStmt.hasBody()) stmtStack.unshift(...curStmt.body);
                }

                aboveMultilineStmt.body.push(removedItem[0]);

                this.rebuildBody(0, 1);
            }
        }
    }

    removeStatement(line: Statement): CodeConstruct {
        const root = line.rootNode;

        if (root instanceof Module || root instanceof Statement) {
            const replacement = new EmptyLineStmt(root, line.indexInRoot);
            this.recursiveNotify(line, CallbackType.delete);
            root.body.splice(line.indexInRoot, 1, replacement);
            replacement.build(line.getLeftPosition());
            this.rebuildBody(0, 1);

            return replacement;
        }

        return null;
    }

    deleteLine(line: Statement) {
        const root = line.rootNode;

        if (root instanceof Module || root instanceof Statement) {
            this.recursiveNotify(line, CallbackType.delete);
            root.body.splice(line.indexInRoot, 1);
            this.rebuildBody(0, 1);
        }
    }

    removeItem(item: CodeConstruct): CodeConstruct {
        const root = item.rootNode;

        if (root instanceof Statement) {
            const replacedItem = new TypedEmptyExpr(root.typeOfHoles[item.indexInRoot]);
            this.recursiveNotify(item, CallbackType.delete);

            root.tokens.splice(item.indexInRoot, 1, replacedItem)[0];

            for (let i = 0; i < root.tokens.length; i++) {
                root.tokens[i].indexInRoot = i;
                root.tokens[i].rootNode = root;
            }

            root.rebuild(root.getLeftPosition(), 0);

            return replacedItem;
        }

        return null;
    }

    insertAfterIndex(focusedCode: CodeConstruct, index: number, items: Array<CodeConstruct>) {
        if (focusedCode instanceof Token || focusedCode instanceof Expression) {
            const root = focusedCode.rootNode;

            if (root instanceof Expression && root.tokens.length > 0) {
                root.tokens.splice(index, 0, ...items);

                for (let i = 0; i < root.tokens.length; i++) {
                    root.tokens[i].indexInRoot = i;
                    root.tokens[i].rootNode = root;
                }

                root.rebuild(root.getLeftPosition(), 0);
            }
        }
    }

    reset() {
        this.body = new Array<Statement>();

        this.body.push(new EmptyLineStmt(this, 0));
        this.scope = new Scope();

        this.body[0].build(new monaco.Position(1, 1));
        this.focus.updateContext({ tokenToSelect: this.body[0] });

        this.editor.reset();
        this.editor.monaco.focus();

        this.variableButtons.forEach((button) => button.remove());
        this.variableButtons = [];

        this.notificationSystem.clearAllNotifications();
    }

    addVariableButtonToToolbox(ref: VarAssignmentStmt) {
        const button = document.createElement("div");
        button.classList.add("button");
        button.id = ref.buttonId;

        document.getElementById("variables").appendChild(button);

        button.addEventListener("click", this.getVarRefHandler(ref).bind(this));

        this.variableButtons.push(button);
    }

    getVarRefHandler(ref: VarAssignmentStmt) {
        return function () {
            this.insert(new VariableReferenceExpr(ref.getIdentifier(), ref.dataType, ref.buttonId));
        };
    }

    addStatement(newStmt: Statement, index: number, lineNumber: number) {
        this.body.splice(index, 0, newStmt);
        for (let i = index + 1; i < this.body.length; i++) this.body[i].indexInRoot++;

        this.rebuildBody(index + 1, lineNumber + newStmt.getHeight());

        if (newStmt instanceof VarAssignmentStmt) {
            this.addVariableButtonToToolbox(newStmt);
            this.scope.references.push(new Reference(newStmt, this.scope));
        }

        if (newStmt instanceof ForStatement) {
            const varAssignStmt = new VarAssignmentStmt("", newStmt);
            varAssignStmt.lineNumber = lineNumber;
            newStmt.buttonId = varAssignStmt.buttonId;

            newStmt.loopVar = varAssignStmt;

            this.addVariableButtonToToolbox(varAssignStmt);
            newStmt.scope.references.push(new Reference(varAssignStmt, this.scope));
        }
    }

    insertEmptyLine() {
        const curPos = this.editor.monaco.getPosition();
        const curStatement = this.focus.getFocusedStatement();
        const parentRoot = curStatement.rootNode;

        let leftPosToCheck = 1;
        let parentStmtHasBody = false;
        let textToAdd = "\n";
        let spaces = "";
        let atCompoundStmt = false;

        if (parentRoot instanceof Statement && parentRoot.hasBody()) {
            // is inside the body of another statement
            leftPosToCheck = parentRoot.left + TAB_SPACES;
            parentStmtHasBody = true;

            if (leftPosToCheck != 1) {
                for (let i = 0; i < parentRoot.left + TAB_SPACES - 1; i++) spaces += " ";
            }
        }

        if (curStatement instanceof Statement && curStatement.hasBody() && curPos.column != curStatement.left) {
            // is at the header statement of a statement with body
            leftPosToCheck = curStatement.left + TAB_SPACES;
            parentStmtHasBody = true;
            atCompoundStmt = true;

            if (leftPosToCheck != 1) {
                for (let i = 0; i < curStatement.left + TAB_SPACES - 1; i++) spaces += " ";
            }
        }

        if (curPos.column == leftPosToCheck) {
            // insert emptyStatement at this line, move other statements down
            const emptyLine = new EmptyLineStmt(parentStmtHasBody ? parentRoot : this, curStatement.indexInRoot);

            emptyLine.build(curStatement.getLeftPosition());

            if (parentStmtHasBody)
                (parentRoot as Statement).addStatement(emptyLine, curStatement.indexInRoot, curStatement.lineNumber);
            else this.addStatement(emptyLine, curStatement.indexInRoot, curStatement.lineNumber);

            const range = new monaco.Range(curStatement.lineNumber - 1, 1, curStatement.lineNumber - 1, 1);
            this.editor.executeEdits(range, null, spaces + textToAdd);
        } else {
            // insert emptyStatement on next line, move other statements down
            const emptyLine = new EmptyLineStmt(parentStmtHasBody ? parentRoot : this, curStatement.indexInRoot + 1);
            emptyLine.build(new monaco.Position(curStatement.lineNumber + 1, leftPosToCheck));

            if (parentStmtHasBody && atCompoundStmt) {
                emptyLine.indexInRoot = 0;
                emptyLine.rootNode = curStatement;
                (curStatement as Statement).addStatement(emptyLine, 0, curStatement.lineNumber + 1);
            } else if (parentStmtHasBody)
                (parentRoot as Statement).addStatement(
                    emptyLine,
                    curStatement.indexInRoot + 1,
                    curStatement.lineNumber + 1
                );
            else this.addStatement(emptyLine, curStatement.indexInRoot + 1, curStatement.lineNumber + 1);

            const range = new monaco.Range(
                curStatement.lineNumber,
                curStatement.right,
                curStatement.lineNumber,
                curStatement.right
            );
            this.editor.executeEdits(range, null, textToAdd + spaces);
            this.focus.updateContext({ tokenToSelect: emptyLine });
        }
    }

    replaceFocusedStatement(newStmt: Statement) {
        const focusedNode = this.focus.getContext().lineStatement;
        const curLineNumber = this.body[focusedNode.indexInRoot].lineNumber;

        this.body[focusedNode.indexInRoot] = newStmt;
        newStmt.rootNode = focusedNode.rootNode;
        newStmt.indexInRoot = focusedNode.indexInRoot;
        newStmt.init(focusedNode.getLeftPosition());

        if (newStmt.hasScope()) newStmt.scope.parentScope = this.scope;

        if (newStmt instanceof VarAssignmentStmt) {
            this.addVariableButtonToToolbox(newStmt);
            this.scope.references.push(new Reference(newStmt, this.scope));
        }

        if (newStmt instanceof ForStatement) {
            const varAssignStmt = new VarAssignmentStmt("", newStmt);
            varAssignStmt.lineNumber = newStmt.lineNumber;
            newStmt.buttonId = varAssignStmt.buttonId;

            newStmt.loopVar = varAssignStmt;

            this.addVariableButtonToToolbox(varAssignStmt);
            newStmt.scope.references.push(new Reference(varAssignStmt, this.scope));
        }

        if (newStmt.getHeight() > 1) this.rebuildBody(newStmt.indexInRoot + 1, curLineNumber + newStmt.getHeight());
    }

    rebuildBody(fromIndex: number, startLineNumber: number) {
        let lineNumber = startLineNumber;

        for (let i = fromIndex; i < this.body.length; i++) {
            this.body[i].indexInRoot = i;

            if (this.body[i].hasBody()) this.body[i].rebuildBody(0, lineNumber);
            else this.body[i].setLineNumber(lineNumber);

            lineNumber += this.body[i].getHeight();
        }
    }

    replaceFocusedExpression(expr: Expression) {
        const context = this.focus.getContext();

        if (context.expression != null) {
            const root = context.expression.rootNode as Statement;
            root.replace(expr, context.expression.indexInRoot);
        } else if (context.token != null) {
            const root = context.token.rootNode as Statement;
            root.replace(expr, context.token.indexInRoot);
        }
    }

    ///------------------VALIDATOR BEGIN

    //TODO: How we insert also depends on where we are in relation to the construct: to the left, to the right or within.
    // > 123 ==> --- > 123      and      123 > ==> 123 > ---      and    --- ==> --- > ---
    //I don't know if we want this function to return this type of information.

    //TODO: This method will not be part of module in the future, that is why it needs a context param

    //Accepts context because this will not be part of Module in the future
    isAbleToInsertComparator(context: Context, insertEquals: boolean = false): boolean {
        return (
            (context.selected &&
                context.token instanceof TypedEmptyExpr &&
                (context.token as TypedEmptyExpr).type.indexOf(DataType.Boolean) > -1) ||
            //TODO: This case needs to be extended further since this is not always possible
            //      For example: randint(1, 2) cannot become randint(1 > 2, 2)
            //      Parent needs to be involved in the check
            //left or right is an expression
            context.expressionToLeft.returns === DataType.Number ||
            context.expressionToRight.returns === DataType.Number ||
            //equals can compare types other than Number (of course >, >=, < and <= also operate on types other than Number, but ignore that for now since our tool likely does not need it)
            (context.expressionToLeft && context.expressionToRight && insertEquals)
        );

    }

    /**
     * Visually mark toolbox buttons of constructs the insertion of which into insertInto will trigger draft mode.
     * 
     * @param insertInto construct to validate insertion against
     * @param constructs list of possible insertions
     */
    updateDraftModeToolboxButtons(insertInto: CodeConstruct, constructs: Array<ConstructKeys>){
        const dummyConstructs = Util.getInstance(this).dummyToolboxConstructs;
        for(const construct of constructs){
            const constructButton = document.getElementById(constructToToolboxButton.get(construct));
            
            if(this.tryInsert(insertInto, dummyConstructs.get(construct)) === InsertionType.DraftMode){
                constructButton.classList.add(Module.draftModeButtonClass);
            }
            else{
                constructButton.classList.remove(Module.draftModeButtonClass);
            }
        }
    }

    updateDraftModeToolboxVarButtons(refs: any[]){
        for(const ref of refs){
            const button = document.getElementById(((ref[0] as Reference).statement as VarAssignmentStmt).buttonId);
            if(ref[1] === InsertionType.DraftMode){
                button.classList.add(Module.draftModeButtonClass);
            }
            else{
                button.classList.remove(Module.draftModeButtonClass);
            }
        }
    }

    /**
     * Produce a map of Util.ConstructKeys to boolean stating whether a given construct is available for insertion
     * or a draft mode insertion into focusedNode.
     * 
     * @param focusedNode code construct that is used to test insertions against.
     * @returns           A mapping from code construct to whether it can be inserted at the given focusedNode. 
     */
    getAllValidInsertsMap(focusedNode: CodeConstruct): Map<ConstructKeys, boolean> {
        const validInserts = new Map<ConstructKeys, boolean>();

        try {
            Object.keys(ConstructKeys).forEach((key) => {
                const insertionType = this.tryInsert(focusedNode, Util.getInstance(this).dummyToolboxConstructs.get(ConstructKeys[key]));
                
                validInserts.set(
                    ConstructKeys[key],
                    insertionType === InsertionType.Invalid ? false : true
                );
            });
        } catch (e) {
            console.error("Unable to get valid inserts map for " + focusedNode + "\n\n" + e);
        } finally {
            return validInserts;
        }
    }

    /**
     * Produce a list of all code constructs that can be inserted into focusedNode or can be inserted by activating draft mode.
     * 
     * @param focusedNode code construct to test insertions against.
     * @returns           a list of ConstructKeys.
     */
    getAllValidInsertsList(focusedNode: CodeConstruct): Array<ConstructKeys> {
        const validInsertsList = [];

        try {
            Object.keys(ConstructKeys).forEach((key) => {
                if (
                    this.tryInsert(focusedNode, Util.getInstance(this).dummyToolboxConstructs.get(ConstructKeys[key])) !== InsertionType.Invalid
                ) {
                    validInsertsList.push(ConstructKeys[key]);
                }
            });
        } catch (e) {
            console.error("Unable to get valid inserts list for:");
            console.error(focusedNode)
            console.error(e);
        } finally {
            return validInsertsList;
        }
    }

    /**
     * Filter insertSet to contain only code constructs that can be inserted into focusedNode and constructs that will cause draft mode to be activated upon insertion.
     * 
     * @param focusedNode code construct to test insertions against.
     * @param insertSet   a list of ConstructKeys representing code constructs to filter.
     * @returns           a list of ConstructKeys.
     */
    getValidInsertsFromSet(focusedNode: CodeConstruct, insertSet: Array<ConstructKeys>) {
        const validInserts = this.getAllValidInsertsMap(focusedNode);

        return insertSet.filter((insertionCandidate) => validInserts.get(insertionCandidate));
    }

    tryInsert(insertInto: CodeConstruct, insert: CodeConstruct): InsertionType {
        if (!insertInto || !insert) {
            console.error(
                "Failed to perform insertion check on\n   insertInto: " + insertInto + "\n   insert: " + insert
            );
            return null;
        }

        if (insert instanceof MethodCallExpr) {
            const focusedPos = this.editor.monaco.getPosition();
            const prevItem = insertInto
                .getParentStatement()
                .locate(new monaco.Position(focusedPos.lineNumber, focusedPos.column - 1));

            if (prevItem instanceof Expression && prevItem.returns == insert.calledOn /* TODO: and check calledOn */) {
                // will replace the expression with this
                // and will have the expression as the first element inside the code
                insert.indexInRoot = prevItem.indexInRoot;
                insert.rootNode = prevItem.rootNode;

                if (insert.rootNode instanceof Expression || insert.rootNode instanceof Statement) return InsertionType.Valid;
            } else if (prevItem instanceof Expression && prevItem.returns != insert.calledOn) return InsertionType.Invalid;
        }

        if (insert.addableType != AddableType.NotAddable && insertInto.receives.indexOf(insert.addableType) > -1) {
            const focusedPos = insertInto.getLeftPosition();
            const parentStatement = insertInto.getParentStatement();
            const parentRoot = parentStatement.rootNode;
            if (insertInto.receives.indexOf(AddableType.Statement) > -1) {
                // replaces statement with the newly inserted statement
                const statement = insert as Statement;

                if (parentRoot instanceof Statement && parentRoot.hasBody()) {
                    if (insert instanceof ElseStatement && parentRoot instanceof IfStatement) {
                        if (parentRoot.isValidElseInsertion(insertInto.indexInRoot, insert)) return InsertionType.Valid;
                    } else if (!(statement instanceof ElseStatement)) return InsertionType.Valid;
                } else if (!(statement instanceof ElseStatement)) return InsertionType.Valid;
                else{return InsertionType.Invalid}
            } else if (insertInto.receives.indexOf(AddableType.Expression) > -1) {
                let isValid = true;

                if (insert instanceof VariableReferenceExpr) {
                    // prevent out of scope referencing of a variable
                    if (parentRoot instanceof IfStatement) {
                        isValid = parentRoot.isValidReference(
                            insert.uniqueId,
                            focusedPos.lineNumber,
                            parentStatement.indexInRoot
                        );
                    } else if (parentRoot instanceof Module || parentRoot instanceof Statement) {
                        isValid = parentRoot.scope.isValidReference(insert.uniqueId, focusedPos.lineNumber);
                    }

                    if (!isValid) return InsertionType.Invalid;

                    return InsertionType.Valid;
                }

                //special case for BinaryOperatorExpression +
                //because it can return either a string or a number, we need to determine what it returns during insertion
                //Insertion of a BinaryOperatorExpr into a TypedEmptyExpr
                if (
                    isValid &&
                    insert instanceof BinaryOperatorExpr &&
                    insert.operator == BinaryOperator.Add &&
                    insertInto instanceof TypedEmptyExpr
                ) {
                    if(insertInto.type.indexOf(DataType.String) > -1 || insertInto.type.indexOf(DataType.Number) > -1 || insertInto.type.indexOf(DataType.Any) > -1){
                        return InsertionType.Valid;
                    }else if(hasMatch(Util.getInstance(this).typeConversionMap.get(insert.returns), insertInto.type)){
                        return InsertionType.DraftMode;
                    }
                }

                //type checks -- different handling based on type of code construct
                //insertInto.returns != code.returns would work, but we need more context to get the right error message
                //Insertion of an Expression into a TypedEmptyExpr contained within some other Expression or Statement
                if (isValid && insertInto instanceof TypedEmptyExpr && insert instanceof Expression) {
                    //inserting an Expression into a TypedEmptyExpr of a BinaryBoolOperatorExpr
                    if (insertInto.rootNode instanceof BinaryBoolOperatorExpr) {
                        if (insert.returns != DataType.Boolean && Util.getInstance(this).typeConversionMap.get(insert.returns).indexOf(insert.returns)) return InsertionType.DraftMode;
                        return InsertionType.Valid;
                    }
                    //for-loop check is special since Iterable does not cover both str and list right now
                    //can change it once the types are an array
                    //inserting an Expression into the second hole of a for-loop
                    else if (insertInto.rootNode instanceof ForStatement) {
                        if(this.typeSystem.validateForLoopIterableInsertionType(insert)) {return InsertionType.Valid}
                        else if(hasMatch(Util.getInstance(this).typeConversionMap.get(insert.returns), TypeSystem.listTypes)){
                            return InsertionType.DraftMode;
                        }
                    } else {
                        if(insertInto.type.indexOf(insert.returns) > -1 || insertInto.type.indexOf(DataType.Any) > -1){return InsertionType.Valid}
                        else if(hasMatch(Util.getInstance(this).typeConversionMap.get(insert.returns), insertInto.type)){return InsertionType.DraftMode}
                        else{return InsertionType.Invalid}
                    }
                }

                //type check for binary ops (separate from above because they don't use TypedEmptyExpressions)
                let existingLiteralType = null;
                if (
                    (insertInto.rootNode instanceof BinaryOperatorExpr ||
                        insertInto.rootNode instanceof ComparatorExpr) &&
                    insert instanceof Expression
                ) {
                    //record the type of any hole that is already filled
                    if (insertInto.rootNode.tokens[insertInto.rootNode.getLeftOperandIndex()] instanceof Expression) {
                        existingLiteralType = (
                            insertInto.rootNode.tokens[insertInto.rootNode.getLeftOperandIndex()] as Expression
                        ).returns;
                    } else if (
                        insertInto.rootNode.tokens[insertInto.rootNode.getRightOperandIndex()] instanceof Expression
                    ) {
                        existingLiteralType = (
                            insertInto.rootNode.tokens[insertInto.rootNode.getRightOperandIndex()] as Expression
                        ).returns;
                    }

                    if(existingLiteralType != null && existingLiteralType != insert.returns){return InsertionType.Valid}
                    else if(existingLiteralType != null && Util.getInstance(this).typeConversionMap.get(insert.returns).indexOf(existingLiteralType)){return InsertionType.DraftMode}
                }

                return InsertionType.Valid;
            }
            
        } else return InsertionType.Invalid;
    }

    ///------------------VALIDATOR END

    insert(code: CodeConstruct, insertInto?: CodeConstruct) {
        const context = this.focus.getContext();
        const focusedNode = insertInto ?? this.focus.onEmptyLine() ? context.lineStatement : context.token;

        const insertionType = code instanceof VariableReferenceExpr ? 
                Validator.getValidVariableReferences(focusedNode)
                         .filter(record => ((record[0] as Reference).statement as VarAssignmentStmt).buttonId === (code as VariableReferenceExpr).uniqueId)
                         .map(record => record[1])[0] as InsertionType
            : 
                this.tryInsert(focusedNode, code) as InsertionType;

        let isValid = false;

        if (focusedNode) {
            if (code instanceof MethodCallExpr  && insertionType !== InsertionType.DraftMode) {
                const focusedPos = context.position;
                const prevItem = context.token
                    .getParentStatement()
                    .locate(new monaco.Position(focusedPos.lineNumber, focusedPos.column - 1));

                if (prevItem instanceof Expression && prevItem.returns == code.calledOn) {
                    // will replace the expression with this
                    // and will have the expression as the first element inside the code
                    code.indexInRoot = prevItem.indexInRoot;
                    code.rootNode = prevItem.rootNode;

                    if (code.rootNode instanceof Expression || code.rootNode instanceof Statement) {
                        code.rootNode.replace(code, code.indexInRoot);
                    }

                    code.setExpression(prevItem);

                    const range = new monaco.Range(
                        focusedPos.lineNumber,
                        code.left,
                        focusedPos.lineNumber,
                        focusedPos.column
                    );

                    if (focusedNode.notification && context.selected) {
                        this.notificationSystem.removeNotificationFromConstruct(focusedNode);
                    }

                    this.editor.executeEdits(range, code);
                    prevItem.rebuild(new monaco.Position(focusedPos.lineNumber, prevItem.left), 0);
                } else if (prevItem instanceof Expression && prevItem.returns != code.calledOn) {
                    //TODO: relies on tokens array not changing the index of function name
                    //Not sure why hardcoded, probably because identifier token is not accessible, but change that

                    //TODO: Don't think this will need a check for context.selected like notification removal does, but if it does, just add it.
                    //Presumably if insert was called then the insert context is valid.
                    //I don't think notification removal needs that check either to be honest for the same reason.
                    this.notificationSystem.addHoverNotification(
                        focusedNode,
                        {
                            objectType: prevItem.returns,
                            method: (code.tokens[2] as NonEditableTkn).text,
                            calledOn: code.calledOn,
                        },
                        "",
                        ErrorMessage.methodCallObjectTypeMismatch
                    );
                }
            }

            if (code.addableType != AddableType.NotAddable && focusedNode.receives.indexOf(code.addableType) > -1  && insertionType !== InsertionType.DraftMode) {
                //we don't always insert into a token, sometimes it may be an empty line
                const focusedPos = this.focus.onEmptyLine()
                    ? context.lineStatement.getLeftPosition()
                    : context.token.getLeftPosition();

                // TODO: validations => context.token.isEmpty

                const parentStatement = context.lineStatement;
                const parentRoot = parentStatement.rootNode;

                if (focusedNode.receives.indexOf(AddableType.Statement) > -1) {
                    // replaces statement with the newly inserted statement
                    const statement = code as Statement;

                    if (parentRoot instanceof Statement && parentRoot.hasBody()) {
                        if (code instanceof ElseStatement && parentRoot instanceof IfStatement) {
                            if (parentRoot.isValidElseInsertion(focusedNode.indexInRoot, code)) {
                                parentRoot.insertElseStatement(focusedNode.indexInRoot, code);

                                const range = new monaco.Range(
                                    focusedPos.lineNumber,
                                    focusedPos.column - TAB_SPACES,
                                    focusedPos.lineNumber,
                                    focusedPos.column
                                );

                                this.editor.executeEdits(
                                    range,
                                    code,
                                    code.getRenderText() + "\n" + emptySpaces(focusedPos.column - 1)
                                );

                                if (focusedNode.notification && context.selected) {
                                    this.notificationSystem.removeNotificationFromConstruct(focusedNode);
                                }
                            }
                        } else if (!(statement instanceof ElseStatement)) {
                            parentRoot.replaceInBody(focusedNode.indexInRoot, statement);

                            var range = new monaco.Range(
                                focusedPos.lineNumber,
                                code.left,
                                focusedPos.lineNumber,
                                code.right
                            );

                            if (focusedNode.notification && context.selected) {
                                this.notificationSystem.removeNotificationFromConstruct(focusedNode);
                            }

                            this.editor.executeEdits(range, code);
                        }
                    } else if (!(statement instanceof ElseStatement)) {
                        this.replaceFocusedStatement(statement);

                        const range = new monaco.Range(
                            focusedPos.lineNumber,
                            statement.left,
                            focusedPos.lineNumber,
                            statement.right
                        );

                        if (focusedNode.notification) {
                            this.notificationSystem.removeNotificationFromConstruct(focusedNode);
                        }

                        this.editor.executeEdits(range, statement);
                    }
                } else if (focusedNode.receives.indexOf(AddableType.Expression) > -1) {
                    isValid = true;

                    if (code instanceof VariableReferenceExpr) {
                        // prevent out of scope referencing of a variable
                        if (parentRoot instanceof IfStatement)
                            isValid = parentRoot.isValidReference(
                                code.uniqueId,
                                focusedPos.lineNumber,
                                parentStatement.indexInRoot
                            );
                        else if (parentRoot instanceof Module || parentRoot instanceof Statement) {
                            isValid = parentRoot.scope.isValidReference(code.uniqueId, focusedPos.lineNumber);
                        }

                        if (!isValid) {
                            //TODO: Used to hold notif for variable out of scope reference, but it was not refactored with the new refactoring. Look at any older code to add it back when there is time.
                            
                        }

                        if (isValid && focusedNode.notification) {
                            this.notificationSystem.removeNotificationFromConstruct(focusedNode);
                        }
                    }

                    //type checks -- different handling based on type of code construct
                    //focusedNode.returns != code.returns would work, but we need more context to get the right error message
                    if (isValid && focusedNode instanceof TypedEmptyExpr && code instanceof Expression) {
                        isValid = focusedNode.rootNode.typeValidateInsertionIntoHole(code, true, focusedNode, this.notificationSystem);

                        if(isValid){
                            code.performPreInsertionUpdates(focusedNode);
    
                            if (focusedNode.rootNode instanceof ForStatement) {
                                this.typeSystem.updateForLoopVarType(focusedNode.rootNode, code); //TODO: should be placed inside of doOnInsert() which is a method of all CodeConstructs
                            }
                            //This is for ListLiterals when their parent is a variable.
                            //It needs to be refactored along with the rest of similar updates so that anything that has a rootNode that is a 
                            //VarAssignment changes the vars dataType.
                            if (
                                focusedNode.rootNode.rootNode &&
                                focusedNode.rootNode.rootNode instanceof VarAssignmentStmt
                            ) {
                                const newType = TypeSystem.getListTypeFromElementType(code.returns);
                                this.typeSystem.updateDataTypeOfVarRefInToolbox(focusedNode.rootNode.rootNode, newType);
                            }
    
                             //inserting a list identifier into a MemberCallStmt needs to update the variable's type if it is being assigned to one
                            if (
                                focusedNode.rootNode instanceof MemberCallStmt &&
                                focusedNode.rootNode.rootNode instanceof VarAssignmentStmt &&
                                focusedNode instanceof TypedEmptyExpr
                            ) {
                                const newType = TypeSystem.getElementTypeFromListType((code as Expression).returns);
                                this.typeSystem.updateDataTypeOfVarRefInToolbox(focusedNode.rootNode.rootNode, newType);
                            }

                        }
                    }

                    //inserting a bin op within a bin op (excluding bool bin op)
                    if (
                        (focusedNode.rootNode instanceof BinaryOperatorExpr ||
                            focusedNode.rootNode instanceof ComparatorExpr) &&
                        (focusedNode.rootNode?.rootNode instanceof BinaryOperatorExpr ||
                            focusedNode.rootNode?.rootNode instanceof ComparatorExpr) &&
                        code instanceof Expression
                    ) {
                        this.typeSystem.setAllHolesToType(focusedNode.rootNode.rootNode, [code.returns]);
                    }

                    if (isValid) {
                        if (focusedNode.notification && context.selected) {
                            this.notificationSystem.removeNotificationFromConstruct(focusedNode);
                        }

                        // replaces expression with the newly inserted expression
                        const expr = code as Expression;

                        /**
                         * Update type of variable in toolbox.
                         * Case 1: Variable is assigned some literal val
                         * Case 2: Variable was assigned an arithmetic expression that is now being populated with literals.
                         *         Therefore, variable assumes type returned by the arithmetic expression.
                         */
                        if (focusedNode.rootNode instanceof VarAssignmentStmt) {
                            this.typeSystem.updateDataTypeOfVarRefInToolbox(focusedNode.rootNode, expr.returns);
                        } else if (
                            parentStatement instanceof VarAssignmentStmt &&
                            parentStatement.dataType == DataType.Any &&
                            focusedNode.rootNode instanceof BinaryOperatorExpr
                        ) {
                            this.typeSystem.updateDataTypeOfVarRefInToolbox(parentStatement, expr.returns);
                        }

                        //update types of expressions that need an update
                        if (focusedNode.rootNode instanceof BinaryOperatorExpr) {
                            focusedNode.rootNode.returns = expr.returns;
                        }

                        this.replaceFocusedExpression(expr);

                        const range = new monaco.Range(
                            focusedPos.lineNumber,
                            focusedNode.left,
                            focusedPos.lineNumber,
                            focusedNode.right
                        );

                        this.editor.executeEdits(range, expr);
                    }
                }

                //TODO: This should probably run only if the insert above was successful, we cannot assume that it was
                if (!focusedNode.notification) {
                    const newContext = code.getInitialFocus();
                    this.focus.updateContext(newContext);
                }
            } else {

                //TODO: This type of logic should not be inside the  It should be moved somewhere like a validator class or even the notification-system-controller.
                //However with the current architecture this is the best solution. The AST has all the information needed to make these decisions.
                if (code.addableType == AddableType.NotAddable) {
                    console.warn("Cannot insert this code construct at focused location.");

                    this.notificationSystem.addHoverNotification(focusedNode, {}, "", ErrorMessage.default);
                } 
                else if (focusedNode.receives.indexOf(code.addableType) == -1 && insertionType == InsertionType.Invalid) {
                    console.warn("Cannot insert this code construct at focused location.");

                    if (focusedNode.rootNode instanceof Statement) {
                        if (focusedNode.rootNode.getKeyword() != "") {
                            //for, while, if, elseif
                            this.notificationSystem.addHoverNotification(
                                focusedNode,
                                {
                                    constructName: focusedNode.rootNode.getKeyword(),
                                    addedType: code.addableType,
                                    focusedNode: focusedNode,
                                },
                                "",
                                ErrorMessage.addableTypeMismatchControlStmt
                            );
                        } else if (
                            focusedNode.rootNode instanceof BinaryBoolOperatorExpr ||
                            focusedNode.rootNode instanceof ComparatorExpr ||
                            focusedNode.rootNode instanceof BinaryOperatorExpr ||
                            focusedNode.rootNode instanceof UnaryOperatorExpr
                        ) {
                            this.notificationSystem.addHoverNotification(
                                focusedNode,
                                { addedType: code.addableType }, "",
                                ErrorMessage.addableTypeMismatchGeneral
                            );
                        } else {
                            //parent = VarAssignmentStmt || MethodCallStmt || EmptyLineStmt --although last one should not ever be present here
                            if (focusedNode.rootNode instanceof MethodCallStmt) {
                                console.log("Address this once lists are fixed.");
                            } else if (focusedNode.rootNode instanceof VarAssignmentStmt) {
                                this.notificationSystem.addHoverNotification(
                                    focusedNode,
                                    { constructName: "Variable assignment", addedType: code.addableType },
                                    "",
                                    ErrorMessage.addableTypeMismatchVarAssignStmt
                                );
                            } else if (focusedNode.rootNode instanceof FunctionCallStmt) {
                                if (code instanceof Expression) {
                                    this.notificationSystem.addHoverNotification(
                                        focusedNode,
                                        {
                                            argType1: (focusedNode as TypedEmptyExpr).type,
                                            argType2: code.returns,
                                            methodName: focusedNode.rootNode.getFunctionName(),
                                        },
                                        "",
                                        ErrorMessage.methodArgTypeMismatch
                                    );
                                } else if (code instanceof Statement) {
                                    this.notificationSystem.addHoverNotification(
                                        focusedNode,
                                        { addedType: code.addableType },
                                        "",
                                        ErrorMessage.addableTypeMismatchMethodArg
                                    );
                                }
                            }
                        }
                    } 
                }
                else if(insertionType  === InsertionType.DraftMode && code instanceof Expression){
                    const focusedPos = this.focus.onEmptyLine()
                    ? context.lineStatement.getLeftPosition()
                    : context.token.getLeftPosition();

                    if(code instanceof VariableReferenceExpr && focusedNode instanceof EmptyLineStmt ){
                        this.replaceFocusedStatement(code);
                    }
                    else{
                        this.replaceFocusedExpression(code);
                    }

                    //TODO: Should we include the parent too?
                    code.draftModeEnabled = true;
                    this.draftExpressions.push(new DraftRecord(code, this));
                    code.draftRecord = this.draftExpressions[this.draftExpressions.length - 1];
                    
                    const range = new monaco.Range(
                        focusedPos.lineNumber,
                        focusedNode.left,
                        focusedPos.lineNumber,
                        focusedNode.right
                    );

                    this.editor.executeEdits(range, code);
                }
            
                else { 
                    console.warn("Cannot insert this code construct at focused location.");

                    this.notificationSystem.addHoverNotification(
                        focusedNode,
                        { addedType: code.addableType },
                        "",
                        ErrorMessage.addableTypeMismatchEmptyLine
                    );
                    
                }
            }
            this.editor.monaco.focus();
        }
    }

    closeConstructDraftRecord(code: CodeConstruct){
        if(code.draftModeEnabled){
            code.draftModeEnabled = false;
            const removedRecord = this.draftExpressions.splice(this.draftExpressions.indexOf(code.draftRecord), 1)
            
            code.draftRecord = null;
        }
        else{
            console.warn("Tried closing draft mode of construct that did not have one open.")
        }
    }
}

/**
 * These scopes are created by multi-line statements
 */
export class Scope {
    parentScope: Scope = null;
    references = new Array<Reference>();

    isValidReference(uniqueId: string, line: number): boolean {
        const validReferences = this.getValidReferences(line);

        for (let ref of validReferences) {
            if (
                (ref.statement instanceof VarAssignmentStmt && ref.statement.buttonId == uniqueId) ||
                (ref.statement instanceof ForStatement && ref.statement.buttonId == uniqueId)
            ) {
                return true;
            }
        }

        return false;
    }

    getValidReferences(line: number): Array<Reference> {
        let validReferences = this.references.filter((ref) => ref.line() < line);

        if (this.parentScope != null) {
            validReferences = validReferences.concat(this.parentScope.getValidReferences(line));
        }

        return validReferences;
    }
}

export class Reference {
    /**
     * Currently, either a variable or a function declaration. Could later be a class declaration.
     */
    statement: Statement;

    /**
     * The valid scope in which this item could be referenced.
     */
    scope: Scope;

    constructor(statement: Statement, scope: Scope) {
        this.statement = statement;
        this.scope = scope;
    }

    line(): number {
        return this.statement.lineNumber;
    }
}

function emptySpaces(count: number) {
    let spaces = "";

    for (let i = 0; i < count; i++) spaces += " ";

    return spaces;
}


export class DraftRecord{
    code: Expression;
    warning: HoverNotification;

    private module: Module; //no point in instantiating the editor itself because it will require an instance of Module anyway

    constructor(code: Expression, module: Module){
        this.code =  code;
        this.module = module;

        this.warning = this.module.notificationSystem.addHoverNotification(code, {}, "Draft Mode");
        this.code.notification = this.warning;
    }

    removeNotification(){
        this.module.notificationSystem.removeNotificationFromConstruct(this.code);
    }
}

