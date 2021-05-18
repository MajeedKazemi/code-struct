import * as monaco from "monaco-editor";
import { EventHandler } from "../editor/events";
import { TAB_SPACES } from "./keywords";
import Editor from "../editor/editor";
import ActionStack from "../actions";
import { NotificationSystemController } from '../notification-system/notification-system-controller';
import {ErrorMessage} from "../notification-system/error-msg-generator";
import {Notification} from '../notification-system/notification'

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

export enum EditFunctions {
    InsertStatement,
    RemoveStatement,
    SetExpression,
    SetLiteral,
    ChangeLiteral,
    RemoveExpression,
    AddEmptyItem,
    ChangeIdentifier,
}

export enum DataType {
    Number = "Number",
    Boolean = "Boolean",
    String = "String",
    Fractional = "Float",
    Iterator = "Iterator",
    List = "List",
    Set = "Set",
    Dict = "Dict",
    Class = "Class",
    Void = "Void",
    Any = "Any",
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
     * Different types of valid edits (as a list) that could be received for a selected/focused Statement, Expression, or Token.
     */
    validEdits: Array<EditFunctions>;

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
    nextEmptyToken(): CodeConstruct;

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
     * Finds and returns the next editable code-construct to the right of this code-construct.
     */
    getNextEditableToken(fromIndex?: number): CodeConstruct;

    /**
     * Finds and returns the next editable code-construct to the left of this code-construct.
     */
    getPrevEditableToken(fromIndex?: number): CodeConstruct;

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
}

/**
 * A complete code statement such as: variable assignment, function call, conditional, loop, function definition, and other statements.
 */
export abstract class Statement implements CodeConstruct {
    toString(): string {
        let text = "";

        for (let token of this.tokens) {
            text += token.getRenderText();
        }

        return text;
    }

    isTextEditable = false;

    addableType: AddableType;

    validEdits = new Array<EditFunctions>();
    receives = new Array<AddableType>();

    // boundary
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

	constructor() {
		for (let type in CallbackType) this.callbacks[type] = new Array<Callback>();
	}

    /**
     * The lineNumbers from the beginning to the end of this statement.
     */
    getHeight(): number {
        if (this.body.length == 0) return 1;
        else {
            let height = 1;

            for (let line of this.body) height += line.getHeight();

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

    setLineNumber(lineNumber: number) {
        this.lineNumber = lineNumber;

        for (let token of this.tokens) {
            if (token instanceof Expression) token.setLineNumber(lineNumber);
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
        for (let callback of this.callbacks[type]) callback.callback();
    }

    rebuildBody(fromIndex: number, startLineNumber: number) {
        let lineNumber = startLineNumber;

        for (let i = fromIndex; i < this.body.length; i++) {
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

        for (let i = 0; i < this.tokens.length; i++) curPos = this.tokens[i].build(curPos);

        this.right = curPos.column - 1;

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
        let propagateToRoot = true;

        // rebuild siblings:
        for (let i = fromIndex; i < this.tokens.length; i++) {
            if (this.tokens[i] instanceof Token) curPos = this.tokens[i].build(curPos);
            else curPos = (this.tokens[i] as Expression).build(curPos);

            if (i == fromIndex && i + 1 < this.tokens.length) {
                // has siblings
                let firstSiblingLeft: number;

                if (this.tokens[i] instanceof Token) firstSiblingLeft = this.tokens[i + 1].left;
                else firstSiblingLeft = (this.tokens[i + 1] as Expression).left;

                if (firstSiblingLeft == curPos.column) {
                    propagateToRoot = false;
                    break;
                }
            }
        }

        let newRight = curPos.column - 1;

        if (propagateToRoot && this.right != newRight) {
            this.right = newRight;

            // check if parent's siblings should be rebuilt
            if (this.rootNode != undefined && this.indexInRoot != undefined) {
                if (
                    (this.rootNode instanceof Expression || this.rootNode instanceof Statement) &&
                    this.rootNode.lineNumber == this.lineNumber
                )
                    this.rootNode.rebuild(curPos, this.indexInRoot + 1);
            } else console.warn("node did not have rootNode or indexInRoot: ", this.tokens);
        }

        this.notify(CallbackType.change);
    }

    contains(pos: monaco.Position): boolean {
        if (this.lineNumber == pos.lineNumber && pos.column >= this.left && pos.column <= this.right + 1) return true;

        return false;
    }

    getContainingSingleLineStatement(pos: monaco.Position): Statement {
        if (this.contains(pos)) {
            return this;
        } else {
            for (let line of this.body) {
                let stmt = line.getContainingSingleLineStatement(pos);

                if (stmt != null) return stmt;
            }
        }

        return null;
    }

    getStatementAtLine(line: number): Statement {
        let foundStmt: Statement = null;

        if (this.lineNumber == line) return this;
        else if (this.hasBody())
            for (let stmt of this.body) {
                foundStmt = stmt.getStatementAtLine(line);

                if (foundStmt != null) return foundStmt;
            }

        return null;
    }

    locate(pos: monaco.Position): CodeConstruct {
        if (pos.lineNumber == this.lineNumber) {
            if (pos.column == this.left) return this.tokens[0];
            else if (pos.column == this.right + 1) return this.tokens[this.tokens.length - 1];
        }

        if (this.contains(pos)) for (let code of this.tokens) if (code.contains(pos)) return code.locate(pos);

        return null;
    }

    nextEmptyToken(): CodeConstruct {
        for (let token of this.tokens) {
            if (token instanceof Token) {
                if (token.isEmpty) return token;
            } else {
                let expr = token as Expression;

                if (expr.hasEmptyToken) return expr.nextEmptyToken();

                return null;
            }
        }

        // next editable code-construct
        for (let token of this.tokens) {
            if (token instanceof Token) {
                if (token.validEdits.length > 0) return token;
            } else {
                let expr = token as Expression;

                if (expr.validEdits.length > 0) return expr.nextEmptyToken();

                return null;
            }
        }

        // TODO: return next selectable code-construct
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
        if (toReplace instanceof Statement || toReplace instanceof Expression || toReplace instanceof Token) {
            toReplace.notify(CallbackType.delete);
        }

        // prepare the new Node
        code.rootNode = this;
        code.indexInRoot = index;

        // prepare to rebuild siblings and root (recursively)
        let rebuildColumn: number;

        if (this.tokens[index] instanceof Token) rebuildColumn = this.tokens[index].left;
        else rebuildColumn = (this.tokens[index] as Expression).left;

        // replace
        this.tokens[index] = code;

        if (rebuildColumn) this.rebuild(new monaco.Position(this.lineNumber, rebuildColumn), index);

        this.updateHasEmptyToken(code);

        this.notify(CallbackType.replace);
    }

    /**
     * Replaced the given item with the item in `this.body[index]`
     */
    replaceInBody(index: number, newStmt: Statement) {
        let curLeftPos = this.body[index].getLeftPosition();
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
            this.getModule().addLoopVariableButtonToToolbox(newStmt);
            this.scope.references.push(new Reference(newStmt, this.scope));
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
        let txt: string = "";

        for (let token of this.tokens) txt += token.getRenderText();

        let leftPosToCheck = 1;
        let textToAdd = "\n";

        if (this.hasBody()) {
            leftPosToCheck = this.left + TAB_SPACES - 1;
            if (leftPosToCheck != 1) {
                for (let i = 0; i < leftPosToCheck; i++) textToAdd += " ";
            }
        }

        for (let stmt of this.body) {
            txt += textToAdd + stmt.getRenderText();
        }

        return txt;
    }

    getLineNumber(): number {
        return this.lineNumber;
    }

    getLeftPosition(): monaco.Position {
        return new monaco.Position(this.getLineNumber(), this.left);
    }

    getSelection(): monaco.Selection {
        return new monaco.Selection(this.lineNumber, this.right + 1, this.lineNumber, this.left);
    }

    getNextEditableToken(fromIndex?: number): CodeConstruct {
        let startIndex = fromIndex != undefined ? fromIndex : 0;

        for (let i = startIndex; i < this.tokens.length; i++) {
            if (this.tokens[i].validEdits.length > 0)
                if (this.tokens[i] instanceof Expression || this.tokens[i] instanceof Token)
                    // there is no statement that does not have any editable expression or token, so this should always return something
                    return this.tokens[i];
        }

        return this.getEndOfLineToken();
    }

    getPrevEditableToken(fromIndex?: number): CodeConstruct {
        // let startIndex = fromIndex != undefined ? fromIndex : this.tokens.length - 1;

        if (fromIndex != undefined)
            for (let i = fromIndex; i >= 0; i--) {
                if (this.tokens[i].validEdits.length > 0)
                    if (this.tokens[i] instanceof Expression || this.tokens[i] instanceof Token) return this.tokens[i];
            }

        return this.getStartOfLineToken();
    }

    getParentStatement(): Statement {
        return this;
    }

    /**
     * Get end-of-line token for this statement
     */
    getEndOfLineToken(): CodeConstruct {
        if (this instanceof EmptyLineStmt) return this;

        return this.tokens[this.tokens.length - 1];
    }

    /**
     * Get start-of-line token for this statement
     */
    getStartOfLineToken(): CodeConstruct {
        if (this instanceof EmptyLineStmt) return this;

        return this.tokens[0];
    }

    /**
     * Returns the Module
     * @returns the parent module of the whole system
     */
    getModule(): Module {
        if (this.rootNode instanceof Module) return this.rootNode;
        else return (this.rootNode as Statement).getModule();
    }

    /**
     * Return this statement's keyword if it has one. Otherwise return an empty string.
     * 
     * @returns text representation of statement's keyword or an empty string if it has none
     */
    getKeyword(): string{
        if(this.keywordIndex > -1){
            return (this.tokens[this.keywordIndex] as KeywordTkn).text;
        }
        return "";
    }
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
        else return (this.rootNode as Expression).getLineNumber();
    }

    getSelection(): monaco.Selection {
        let line = this.getLineNumber();

        return new monaco.Selection(line, this.right + 1, line, this.left);
    }

    getNextEditableToken(fromIndex?: number): CodeConstruct {
        let startIndex = fromIndex != undefined ? fromIndex : 0;

        for (let i = startIndex; i < this.tokens.length; i++) {
            if (this.tokens[i].validEdits.length > 0)
                if (this.tokens[i] instanceof Expression || this.tokens[i] instanceof Token) return this.tokens[i];
        }

        if (this.rootNode instanceof Expression && !this.rootNode.isStatement())
            return this.rootNode.getNextEditableToken(this.indexInRoot + 1);
        else if (this.rootNode instanceof Expression && this.rootNode.isStatement())
            return (this.rootNode as Statement).getNextEditableToken(this.indexInRoot + 1);
        else if (this.rootNode instanceof Statement && this.rootNode.body.length == 0)
            return (this.rootNode as Statement).getNextEditableToken(this.indexInRoot + 1);

        return this.getEndOfLineToken();
    }

    getPrevEditableToken(fromIndex?: number): CodeConstruct {
        if (fromIndex != undefined) {
            for (let i = fromIndex; i >= 0; i--) {
                if (this.tokens[i].validEdits.length > 0)
                    if (this.tokens[i] instanceof Expression || this.tokens[i] instanceof Token) return this.tokens[i];
            }
        }

        let prevToken: CodeConstruct = null;

        if (this.rootNode instanceof Expression) prevToken = this.rootNode.getPrevEditableToken();
        else if (this.rootNode instanceof Expression && this.rootNode.isStatement())
            prevToken = (this.rootNode as Statement).getPrevEditableToken();
        else if (this.rootNode instanceof Statement && this.rootNode.body.length == 0)
            prevToken = (this.rootNode as Statement).getPrevEditableToken();

        if (this.rootNode instanceof Expression) prevToken = this.rootNode as Expression;
        else if (this.rootNode instanceof Statement && this.rootNode.body.length == 0)
            prevToken = this.rootNode as Statement;

        if (prevToken == null && this.isStatement()) prevToken = this.getStartOfLineToken();

        return prevToken;
    }

    getParentStatement(): Statement {
        if (this.isStatement()) return this as Statement;
        else if (this.rootNode instanceof Statement && !(this.rootNode instanceof Expression)) return this.rootNode;
        else if (this.rootNode instanceof Expression) return this.rootNode.getParentStatement();
    }
}

/**
 * The smallest code construct: identifiers, holes (for either identifiers or expressions), operators and characters, and etc.
 */
export abstract class Token implements CodeConstruct {
    isTextEditable = false;
    addableType: AddableType;
    rootNode: CodeConstruct = null;
    indexInRoot: number;

    validEdits = new Array<EditFunctions>();
    receives = new Array<AddableType>();

    left: number;
    right: number;

    text: string;
    isEmpty: boolean = false;

    callbacks = new Map<string, Array<Callback>>();

	notification = null;

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
        for (let callback of this.callbacks[type]) callback.callback();
    }

    constructor(text: string, root?: CodeConstruct) {
        for (let type in CallbackType) this.callbacks[type] = new Array<Callback>();

        this.rootNode = root;
        this.text = text;
    }

    /**
     * Builds the left and right positions of this token based on its text length.
     * @param pos the left position to start building this node's right position.
     * @returns the final right position of this node: for tokens it equals to `this.left + this.text.length - 1`
     */
    build(pos: monaco.Position): monaco.Position {
        this.left = pos.column;

        if (this.text.length == 0) this.right = pos.column;
        else this.right = pos.column + this.text.length - 1;

        this.notify(CallbackType.change);

        if (this.text.length == 0) return new monaco.Position(pos.lineNumber, this.right);
        else return new monaco.Position(pos.lineNumber, this.right + 1);
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
    nextEmptyToken(): CodeConstruct {
        if (this.isEmpty) return this;

        return null;
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
        let line = this.getLineNumber();
        let step = this.text.length == 0 ? 0 : 1;

        return new monaco.Selection(line, this.right + step, line, this.left);
    }

    getNextEditableToken(fromIndex?: number): CodeConstruct {
        // should not be called when inside the characters of an editable token

        return this.rootNode.getNextEditableToken(this.indexInRoot + 1);
    }

    getPrevEditableToken(): CodeConstruct {
        // should not be called when inside the characters of an editable token
        if (this.rootNode.validEdits.length > 0) return this.rootNode;
        else return this.rootNode.getPrevEditableToken(this.indexInRoot - 1);

        // return this.rootNode;
    }

    getParentStatement(): Statement {
        if (
            (this.rootNode instanceof Statement && !(this.rootNode instanceof Expression)) ||
            (this.rootNode instanceof Expression && this.rootNode.isStatement())
        )
            return this.rootNode as Statement;
        else if (this.rootNode instanceof Expression) return this.rootNode.getParentStatement();
    }
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
     * checks if the newly updated string could be set (using a Regex) and rebuilds the item if possible and returns `true`, o.w. returns `false`.
     * @param text the updated string to be set to this element.
     */
    setEditedText(text: string): boolean;
}

export class Boundary {
    topLine: number;
    bottomLine: number;
    left: number;
    right: number;

    constructor(topLine: number, bottomLine: number, left: number, right: number) {
        this.topLine = topLine;
        this.bottomLine = bottomLine;
        this.left = left;
        this.right = right;
    }

    contains(pos: monaco.Position): boolean {
        if (
            pos.lineNumber >= this.topLine &&
            pos.lineNumber <= this.bottomLine &&
            pos.column >= this.left &&
            pos.column <= this.right + 1
        )
            return true;

        return false;
    }
}

export class WhileStatement extends Statement {
    addableType = AddableType.Statement;
    private conditionIndex: number;
    scope: Scope;

    constructor(root?: CodeConstruct | Module, indexInRoot?: number) {
        super();

        this.validEdits.push(EditFunctions.RemoveStatement);

        this.tokens.push(new StartOfLineTkn(this, this.tokens.length));
        this.keywordIndex = this.tokens.length;
        this.tokens.push(new KeywordTkn("while", this, this.tokens.length));
        this.tokens.push(new PunctuationTkn(" ", this, this.tokens.length));
        this.conditionIndex = this.tokens.length;
        this.tokens.push(new EmptyExpr(this, this.tokens.length));
        this.tokens.push(new PunctuationTkn(" ", this, this.tokens.length));
        this.tokens.push(new PunctuationTkn(":", this, this.tokens.length));
        this.tokens.push(new EndOfLineTkn(this, this.tokens.length));

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

        this.validEdits.push(EditFunctions.RemoveStatement);

        this.tokens.push(new StartOfLineTkn(this, this.tokens.length));
        this.keywordIndex = this.tokens.length;
        this.tokens.push(new KeywordTkn("if", this, this.tokens.length));
        this.tokens.push(new PunctuationTkn(" ", this, this.tokens.length));
        this.conditionIndex = this.tokens.length;
        this.tokens.push(new EmptyExpr(this, this.tokens.length));
        this.tokens.push(new PunctuationTkn(" ", this, this.tokens.length));
        this.tokens.push(new PunctuationTkn(":", this, this.tokens.length));
        this.tokens.push(new EndOfLineTkn(this, this.tokens.length));

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
                let stmt = this.body[i];

                if (stmt instanceof ElseStatement) break;

                if (stmt instanceof VarAssignmentStmt && uniqueId == stmt.buttonId) return true;
            }
        }

        for (let stmt of this.scope.getValidReferences(this.getLineNumber()))
            if (stmt.statement instanceof VarAssignmentStmt && uniqueId == stmt.statement.buttonId) return true;

        return false;
    }

    isValidElseInsertion(index: number, statement: ElseStatement): boolean {
        if (statement.hasCondition)
            // if there is an else before this elif => invalid
            for (let i = 0; i < index; i++) {
                let stmt = this.body[i];

                if (stmt instanceof ElseStatement && !stmt.hasCondition) return false;
            }
        else {
            // if there is another else => invalid
            for (let stmt of this.body) if (stmt instanceof ElseStatement && !stmt.hasCondition) return false;

            // if the else is before an elif => invalid
            for (let i = index + 1; i < this.body.length; i++) {
                let stmt = this.body[i];

                if (stmt instanceof ElseStatement && stmt.hasCondition) return false;
            }
        }

        return true;
    }

    insertElseStatement(index: number, statement: ElseStatement) {
        let prevPos = this.body[index].getLeftPosition();

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
}

export class ElseStatement extends Statement {
    rootNode: IfStatement;
    addableType = AddableType.Statement;
    private conditionIndex: number;
    hasCondition: boolean = false;

    constructor(hasCondition: boolean, root?: IfStatement, indexInRoot?: number) {
        super();
        this.hasCondition = hasCondition;

        this.validEdits.push(EditFunctions.RemoveStatement);

        this.tokens.push(new StartOfLineTkn(this, this.tokens.length));
        this.keywordIndex = this.tokens.length;
        if (hasCondition) {
            this.tokens.push(new KeywordTkn("elif", this, this.tokens.length));
            this.tokens.push(new PunctuationTkn(" ", this, this.tokens.length));
            this.conditionIndex = this.tokens.length;
            this.tokens.push(new EmptyExpr(this, this.tokens.length));
            this.tokens.push(new PunctuationTkn(" ", this, this.tokens.length));
        } else this.tokens.push(new KeywordTkn("else", this, this.tokens.length));

        this.tokens.push(new PunctuationTkn(":", this, this.tokens.length));
        this.tokens.push(new EndOfLineTkn(this, this.tokens.length));

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
    dataType = DataType.Any;

    constructor(root?: CodeConstruct | Module, indexInRoot?: number) {
        super();

        this.buttonId = "add-var-ref-" + VarAssignmentStmt.uniqueId;
        VarAssignmentStmt.uniqueId++;

        this.validEdits.push(EditFunctions.RemoveStatement);

        this.tokens.push(new StartOfLineTkn(this, this.tokens.length));
        this.keywordIndex = this.tokens.length;
        this.tokens.push(new KeywordTkn("for", this, this.tokens.length));
        this.tokens.push(new PunctuationTkn(" ", this, this.tokens.length));
        this.counterIndex = this.tokens.length;
        this.tokens.push(new IdentifierTkn(undefined, this, this.tokens.length));
        this.tokens.push(new PunctuationTkn(" ", this, this.tokens.length));
        this.tokens.push(new KeywordTkn("in", this, this.tokens.length));
        this.tokens.push(new PunctuationTkn(" ", this, this.tokens.length));
        this.rangeIndex = this.tokens.length;
        this.tokens.push(new EmptyExpr(this, this.tokens.length));
        this.tokens.push(new PunctuationTkn(" ", this, this.tokens.length));
        this.tokens.push(new PunctuationTkn(":", this, this.tokens.length));
        this.tokens.push(new EndOfLineTkn(this, this.tokens.length));

        this.body.push(new EmptyLineStmt(this, 0));
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
}

export class Argument {
    type: DataType;
    name: string;
    isOptional: boolean;

    constructor(type: DataType, name: string, isOptional: boolean) {
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

        this.validEdits.push(EditFunctions.InsertStatement, EditFunctions.RemoveStatement);
        this.receives.push(AddableType.Statement);

        this.rootNode = root;
        this.indexInRoot = indexInRoot;
    }

    build(pos: monaco.Position): monaco.Position {
        this.lineNumber = pos.lineNumber;
        this.left = this.right = pos.column;

        return new monaco.Position(this.lineNumber, this.right + 1);
    }

    nextEmptyToken(): CodeConstruct {
        return this;
    }

    getRenderText(): string {
        return "";
    }

    locate(pos: monaco.Position): CodeConstruct {
        return this;
    }

    getNextEditableToken(): CodeConstruct {
        if (this.rootNode instanceof Statement && this.rootNode.hasBody()) {
            if (this.indexInRoot + 1 < this.rootNode.body.length)
                return this.rootNode.body[this.indexInRoot + 1].getStartOfLineToken();
            else {
                // find if there is another statement below this compound statement that we should jump to the first token of it

                let compoundStmt = this.rootNode;

                if (
                    compoundStmt.rootNode instanceof Module &&
                    compoundStmt.indexInRoot + 1 < compoundStmt.rootNode.body.length
                )
                    return compoundStmt.rootNode.body[compoundStmt.indexInRoot + 1].getStartOfLineToken();
                else if (
                    compoundStmt.rootNode instanceof Statement &&
                    compoundStmt.rootNode.hasBody() &&
                    compoundStmt.indexInRoot + 1 < compoundStmt.rootNode.body.length
                )
                    return compoundStmt.rootNode.body[compoundStmt.indexInRoot + 1].getStartOfLineToken();
                else return this;
            }
        } else if (this.rootNode instanceof Module) {
            let module = this.rootNode as Module;

            if (this.indexInRoot + 1 < module.body.length) {
                return module.body[this.indexInRoot + 1].getStartOfLineToken();
            } else return this;
        }
    }

    getPrevEditableToken(): CodeConstruct {
        if (this.rootNode instanceof Statement && this.rootNode.hasBody()) {
            if (this.indexInRoot == 0) return this.rootNode.getEndOfLineToken();
            else return this.rootNode.body[this.indexInRoot - 1].getEndOfLineToken();
        } else if (this.rootNode instanceof Module) {
            if (this.indexInRoot == 0) return this;
            else return this.rootNode.body[this.indexInRoot - 1].getStartOfLineToken();
        }
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

        this.validEdits.push(EditFunctions.RemoveStatement);

        this.tokens.push(new StartOfLineTkn(this, this.tokens.length));
        this.identifierIndex = this.tokens.length;
        this.tokens.push(new IdentifierTkn(id, this, this.tokens.length));
        this.tokens.push(new PunctuationTkn(" ", this, this.tokens.length));
        this.tokens.push(new OperatorTkn("=", this, this.tokens.length));
        this.tokens.push(new PunctuationTkn(" ", this, this.tokens.length));
        this.valueIndex = this.tokens.length;
        this.tokens.push(new EmptyExpr(this, this.tokens.length));
        this.tokens.push(new EndOfLineTkn(this, this.tokens.length));

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
}

export class VariableReferenceExpr extends Expression {
    isEmpty = false;
    addableType = AddableType.Expression;
    identifier: string;
    uniqueId: string;

    constructor(id: string, returns: DataType, uniqueId: string, root?: CodeConstruct, indexInRoot?: number) {
        super(returns);

        let idToken = new NonEditableTextTkn(id);
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

        if (this.isStatement()) {
            this.validEdits.push(EditFunctions.RemoveStatement);
            this.addableType = AddableType.Statement;
        } else {
            this.validEdits.push(EditFunctions.RemoveExpression);
            this.addableType = AddableType.Expression;
        }

        if (this.isStatement()) this.tokens.push(new StartOfLineTkn(this, this.tokens.length));

        this.tokens.push(new FunctionNameTkn(functionName, this, this.tokens.length));
        this.tokens.push(new PunctuationTkn("(", this, this.tokens.length));

        // TODO: handle parenthesis in a better way (to be able to highlight the other when selecting one)

        for (let i = 0; i < args.length; i++) {
            let arg = args[i];

            this.argumentsIndices.push(this.tokens.length);
            this.tokens.push(new TypedEmptyExpr(arg.type, this, this.tokens.length));

            if (i + 1 < args.length) this.tokens.push(new PunctuationTkn(", ", this, this.tokens.length));
        }

        this.tokens.push(new PunctuationTkn(")", this, this.tokens.length));
        if (this.isStatement()) this.tokens.push(new EndOfLineTkn(this, this.tokens.length));

        this.hasEmptyToken = true;
    }

    replaceArgument(index: number, to: CodeConstruct) {
        this.replace(to, this.argumentsIndices[index]);
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
        this.tokens.push(new EmptyExpr(this, this.tokens.length));
        this.tokens.push(new PunctuationTkn(".", this, this.tokens.length));
        this.tokens.push(new FunctionNameTkn(functionName, this, this.tokens.length));
        this.tokens.push(new PunctuationTkn("(", this, this.tokens.length));

        for (let i = 0; i < args.length; i++) {
            let arg = args[i];

            this.argumentsIndices.push(this.tokens.length);
            this.tokens.push(new TypedEmptyExpr(arg.type, this, this.tokens.length));

            if (i + 1 < args.length) this.tokens.push(new PunctuationTkn(", ", this, this.tokens.length));
        }

        this.tokens.push(new PunctuationTkn(")", this, this.tokens.length));
    }

    setExpression(prevItem: Expression) {
        this.replace(prevItem, this.expressionIndex);
    }

    replaceArgument(index: number, to: CodeConstruct) {
        this.replace(to, this.argumentsIndices[index]);
    }
}

// Statement
//   ExpressionStatement
//       print()
// Expressions
//    let y = x.length

export class MethodCallStmt extends Statement {
    // it has an empty left expression

    private argumentsIndices = new Array<number>();
    addableType: AddableType;

    constructor(functionName: string, args: Array<Argument>, root?: Expression, indexInRoot?: number) {
        super();

        this.rootNode = root;
        this.indexInRoot = indexInRoot;

        if (args.length > 0) this.hasEmptyToken = false;

        this.addableType = AddableType.Statement;

        this.tokens.push(new StartOfLineTkn(this, this.tokens.length));
        this.tokens.push(new EmptyExpr(this, this.tokens.length));
        this.tokens.push(new PunctuationTkn(".", this, this.tokens.length));
        this.tokens.push(new FunctionNameTkn(functionName, this, this.tokens.length));
        this.tokens.push(new PunctuationTkn("(", this, this.tokens.length));

        for (let i = 0; i < args.length; i++) {
            let arg = args[i];

            this.argumentsIndices.push(this.tokens.length);
            this.tokens.push(new TypedEmptyExpr(arg.type, this, this.tokens.length));

            if (i + 1 < args.length) this.tokens.push(new PunctuationTkn(", ", this, this.tokens.length));
        }

        this.tokens.push(new PunctuationTkn(")", this, this.tokens.length));
        this.tokens.push(new EndOfLineTkn(this, this.tokens.length));
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
        this.validEdits.push(EditFunctions.RemoveExpression);

        this.tokens.push(new PunctuationTkn("[", this, this.tokens.length));
        this.rightOperandIndex = this.tokens.length;
        this.tokens.push(new EmptyExpr(this, this.tokens.length));
        this.tokens.push(new PunctuationTkn("]", this, this.tokens.length));

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
        this.validEdits.push(EditFunctions.RemoveExpression);

        this.tokens.push(new PunctuationTkn("(", this, this.tokens.length));
        this.leftOperandIndex = this.tokens.length;
        this.tokens.push(new EmptyExpr(this, this.tokens.length));
        this.tokens.push(new PunctuationTkn(" ", this, this.tokens.length));
        this.tokens.push(new OperatorTkn(operator, this, this.tokens.length));
        this.tokens.push(new PunctuationTkn(" ", this, this.tokens.length));
        this.rightOperandIndex = this.tokens.length;
        this.tokens.push(new EmptyExpr(this, this.tokens.length));
        this.tokens.push(new PunctuationTkn(")", this, this.tokens.length));

        this.hasEmptyToken = true;
    }

    replaceLeftOperand(code: CodeConstruct) {
        this.replace(code, this.leftOperandIndex);
    }

    replaceRightOperand(code: CodeConstruct) {
        this.replace(code, this.rightOperandIndex);
    }

    getLeftOperandIndex(){
        return this.leftOperandIndex;
    }

    getRightOperandIndex(){
        return this.rightOperandIndex;
    }
}

export class UnaryOperatorExpr extends Expression {
    addableType = AddableType.Expression;
    operator: UnaryOp;
    private operandIndex: number;

    constructor(operator: UnaryOp, returns: DataType, root?: CodeConstruct, indexInRoot?: number) {
        super(returns);

        this.rootNode = root;
        this.indexInRoot = indexInRoot;
        this.operator = operator;

        this.addableType = AddableType.Expression;
        this.validEdits.push(EditFunctions.RemoveExpression);

        this.tokens.push(new PunctuationTkn("(", this, this.tokens.length));
        this.tokens.push(new OperatorTkn(operator, this, this.tokens.length));
        this.tokens.push(new PunctuationTkn(" ", this, this.tokens.length));
        this.operandIndex = this.tokens.length;
        this.tokens.push(new EmptyExpr(this, this.tokens.length));
        this.tokens.push(new PunctuationTkn(")", this, this.tokens.length));

        this.hasEmptyToken = true;
    }

    replaceOperand(code: CodeConstruct) {
        this.replace(code, this.operandIndex);
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
        this.validEdits.push(EditFunctions.RemoveExpression);

        this.leftOperandIndex = this.tokens.length;
        this.tokens.push(new PunctuationTkn("(", this, this.tokens.length));
        this.tokens.push(new EmptyExpr(this, this.tokens.length));
        this.tokens.push(new PunctuationTkn(" ", this, this.tokens.length));
        this.tokens.push(new OperatorTkn(operator, this, this.tokens.length));
        this.tokens.push(new PunctuationTkn(" ", this, this.tokens.length));
        this.rightOperandIndex = this.tokens.length;
        this.tokens.push(new EmptyExpr(this, this.tokens.length));
        this.tokens.push(new PunctuationTkn(")", this, this.tokens.length));

        this.hasEmptyToken = true;
    }

    replaceLeftOperand(code: CodeConstruct) {
        this.replace(code, this.leftOperandIndex);
    }

    replaceRightOperand(code: CodeConstruct) {
        this.replace(code, this.rightOperandIndex);
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
        this.validEdits.push(EditFunctions.RemoveExpression);

        this.tokens.push(new PunctuationTkn("(", this, this.tokens.length));
        this.leftOperandIndex = this.tokens.length;
        this.tokens.push(new EmptyExpr(this, this.tokens.length));
        this.tokens.push(new PunctuationTkn(" ", this, this.tokens.length));
        this.tokens.push(new OperatorTkn(operator, this, this.tokens.length));
        this.tokens.push(new PunctuationTkn(" ", this, this.tokens.length));
        this.rightOperandIndex = this.tokens.length;
        this.tokens.push(new EmptyExpr(this, this.tokens.length));
        this.tokens.push(new PunctuationTkn(")", this, this.tokens.length));

        this.hasEmptyToken = true;
    }

    replaceLeftOperand(code: CodeConstruct) {
        this.replace(code, this.leftOperandIndex);
    }

    replaceRightOperand(code: CodeConstruct) {
        this.replace(code, this.rightOperandIndex);
    }

    getLeftOperandIndex(){
        return this.leftOperandIndex;
    }

    getRightOperandIndex(){
        return this.rightOperandIndex;
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

        this.validEdits.push(EditFunctions.ChangeIdentifier);
    }

    getSelection(): monaco.Selection {
        let leftPos = this.getLeftPosition();

        return new monaco.Selection(
            leftPos.lineNumber,
            leftPos.column + this.text.length,
            leftPos.lineNumber,
            leftPos.column
        );
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

        if (this.text.length == 0) this.right = pos.column + this.text.length;
        else this.right = pos.column + this.text.length - 1;

        this.notify(CallbackType.change);

        return new monaco.Position(pos.lineNumber, this.right + 1);
    }
}

export class LiteralValExpr extends Expression {
    addableType = AddableType.Expression;

    constructor(returns: DataType, value?: string, root?: CodeConstruct, indexInRoot?: number) {
        super(returns);

        switch (returns) {
            case DataType.String: {
                this.tokens.push(new PunctuationTkn('"', this, this.tokens.length));
                this.tokens.push(
                    new EditableTextTkn(
                        value == undefined ? "" : value,
                        RegExp('^([^\\r\\n\\"]*)$'),
                        this,
                        this.tokens.length
                    )
                );
                this.tokens.push(new PunctuationTkn('"', this, this.tokens.length));

                break;
            }

            case DataType.Number: {
                this.tokens.push(
                    new EditableTextTkn(
                        value == undefined ? "" : value,
                        RegExp("^(([0-9]*)|(([0-9]*)\\.([0-9]*)))$"),
                        this,
                        this.tokens.length
                    )
                );

                break;
            }

            case DataType.Boolean: {
                this.tokens.push(new NonEditableTextTkn(value, this, this.tokens.length));

                break;
            }
        }

        this.rootNode = root;
        this.indexInRoot = indexInRoot;

        this.validEdits.push(EditFunctions.RemoveExpression);
    }
}

export class EmptyListItem extends Token {
    isEmpty = false;
    isEmptyExpression: boolean;

    constructor(isEmptyExpression: boolean, root?: ListLiteralExpression, indexInRoot?: number) {
        super("");

        this.isEmptyExpression = isEmptyExpression;
        this.validEdits.push(isEmptyExpression ? EditFunctions.SetExpression : EditFunctions.AddEmptyItem);
        this.receives.push(AddableType.Expression);

        this.rootNode = root;
        this.indexInRoot = indexInRoot;
    }

    getSelection(): monaco.Selection {
        let line = this.getLineNumber();

        return new monaco.Selection(line, this.left, line, this.right);
    }
}

export class ListLiteralExpression extends Expression {
    addableType = AddableType.Expression;

    constructor(root?: CodeConstruct, indexInRoot?: number) {
        super(DataType.List);

        this.rootNode = root;
        this.indexInRoot = indexInRoot;

        this.validEdits.push(EditFunctions.RemoveExpression);

        this.tokens.push(new PunctuationTkn("[", this, this.tokens.length));
        this.tokens.push(new EmptyListItem(true, this, this.tokens.length));
        this.tokens.push(new PunctuationTkn("]", this, this.tokens.length));

        this.hasEmptyToken = true;
    }

    rebuildTokensIndices() {
        for (let i = 0; i < this.tokens.length; i++) this.tokens[i].indexInRoot = i;
    }

    replace(code: CodeConstruct, index: number) {
        let curToken = this.tokens[index];

        // replace with: empty + expr + empty
        if (curToken instanceof EmptyListItem && curToken.isEmptyExpression) {
            let rebuildColumn: number;

            if (this.tokens[index] instanceof Token || (this.tokens[index] as Expression))
                rebuildColumn = this.tokens[index].left;

            code.rootNode = this;
            this.tokens.splice(index, 1, new EmptyListItem(false, this), code, new EmptyListItem(false, this));

            this.rebuildTokensIndices();
            this.updateHasEmptyToken(code);

            if (rebuildColumn != undefined) this.rebuild(new monaco.Position(this.lineNumber, rebuildColumn), index);

            this.notify(CallbackType.replace);
        } else super.replace(code, index);
    }

    insertListItem(index: number, value?: number): string {
        let insertedText = "";
        let rebuildColumn: number;

        if (this.tokens[index] instanceof Token || (this.tokens[index] as Expression))
            rebuildColumn = this.tokens[index].left;

        let expr;

        if (value != undefined) expr = new LiteralValExpr(DataType.Number, value.toString(), this);
        else expr = new EmptyExpr(this);

        if (index + 2 == this.tokens.length) {
            // if emptyList right before closing bracket => replace emptyList with: separator + empty + expr + empty
            this.tokens.splice(
                index,
                1,
                new PunctuationTkn(",", this),
                new PunctuationTkn(" ", this),
                new EmptyListItem(false, this),
                expr,
                new EmptyListItem(false, this)
            );

            insertedText = ", " + expr.getRenderText();
        } else {
            // o.w. => replace emptyList with: empty + expr + empty + separator
            this.tokens.splice(
                index,
                1,
                new EmptyListItem(false, this),
                expr,
                new EmptyListItem(false, this),
                new PunctuationTkn(",", this),
                new PunctuationTkn(" ", this)
            );

            insertedText = expr.getRenderText() + ", ";
        }

        this.rebuildTokensIndices();
        this.updateHasEmptyToken(expr);

        if (rebuildColumn != undefined) this.rebuild(new monaco.Position(this.lineNumber, rebuildColumn), index);

        this.notify(CallbackType.change);

        return insertedText;
    }
}

export class IdentifierTkn extends Token implements TextEditable {
    isTextEditable = true;
    addableType = AddableType.Identifier;
    validatorRegex: RegExp;

    constructor(identifier?: string, root?: CodeConstruct, indexInRoot?: number) {
        super(identifier == undefined ? "---" : identifier);

        if (identifier == undefined) {
            this.isEmpty = true;
        } else {
            this.isEmpty = false;
        }

        this.rootNode = root;
        this.indexInRoot = indexInRoot;
        this.validatorRegex = RegExp("^[^\\d\\W]\\w*$");

        this.validEdits.push(EditFunctions.ChangeIdentifier);
    }

    contains(pos: monaco.Position): boolean {
        if (pos.column >= this.left && pos.column <= this.right + 1) return true;

        return false;
    }

    getEditableText(): string {
        return this.text;
    }

    setEditedText(text: string): boolean {
        if (this.validatorRegex.test(text)) {
            this.text = text;
            (this.rootNode as Statement).rebuild(this.getLeftPosition(), this.indexInRoot);

            return true;
        } else {
            this.notify(CallbackType.fail);
            return false;
        }
    }
}

export class NonEditableTextTkn extends Token {
    isEmpty = false;

    constructor(value: string, root?: CodeConstruct, indexInRoot?: number) {
        super(value);

        this.rootNode = root;
        this.indexInRoot = indexInRoot;
    }
}

export class FunctionNameTkn extends Token {
    isEmpty = false;

    constructor(functionName: string, root?: CodeConstruct, indexInRoot?: number) {
        super(functionName);

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

export class TypedEmptyExpr extends Token {
    isEmpty = true;
    type: DataType;

    constructor(type: DataType, root?: CodeConstruct, indexInRoot?: number) {
        super("---");

        this.rootNode = root;
        this.indexInRoot = indexInRoot;
        this.type = type;

        this.validEdits.push(EditFunctions.SetExpression);
        this.receives.push(AddableType.Expression);
    }
}

export class EmptyExpr extends Token {
    isEmpty = true;

    constructor(root?: CodeConstruct, indexInRoot?: number, text?: string) {
        super(text == undefined ? "---" : text);

        this.rootNode = root;
        this.indexInRoot = indexInRoot;

        this.validEdits.push(EditFunctions.SetExpression);
        this.receives.push(AddableType.Expression);
    }
}

export class EndOfLineTkn extends Token {
    isEmpty = false;

    constructor(root?: CodeConstruct, indexInRoot?: number) {
        super("");

        this.rootNode = root;
        this.indexInRoot = indexInRoot;
    }

    getPrevEditableToken(): CodeConstruct {
        return this.rootNode.getPrevEditableToken(this.indexInRoot - 1);
    }

    getNextEditableToken(): CodeConstruct {
        let parentStmt = this.getParentStatement();

        if (parentStmt instanceof Statement && parentStmt.hasBody())
            // we're at the header of this compound statement:
            return parentStmt.body[0].getStartOfLineToken();

        if (parentStmt.rootNode instanceof Statement && parentStmt.rootNode.hasBody()) {
            if (parentStmt.indexInRoot + 1 < parentStmt.rootNode.body.length)
                return parentStmt.rootNode.body[parentStmt.indexInRoot + 1].getStartOfLineToken();
            else {
                // at the end of a compound statement: move to the parent's root's next statement
                let compoundParentsRoot = parentStmt.rootNode.rootNode;

                if (compoundParentsRoot instanceof Module)
                    if (parentStmt.rootNode.indexInRoot + 1 < compoundParentsRoot.body.length)
                        return compoundParentsRoot.body[parentStmt.rootNode.indexInRoot + 1].getStartOfLineToken();
                    else if (compoundParentsRoot instanceof Statement && compoundParentsRoot.hasBody())
                        if (parentStmt.rootNode.indexInRoot + 1 < compoundParentsRoot.body.length)
                            return compoundParentsRoot.body[parentStmt.rootNode.indexInRoot + 1].getStartOfLineToken();

                return this;
            }
        } else if (parentStmt.rootNode instanceof Module) {
            if (parentStmt.indexInRoot + 1 < parentStmt.rootNode.body.length) {
                let lineBelow = parentStmt.rootNode.body[parentStmt.indexInRoot + 1];

                if (lineBelow instanceof EmptyLineStmt) return lineBelow;
                else return lineBelow.getStartOfLineToken();
            } else return this;
        }
    }

    getSelection(): monaco.Selection {
        let line = this.getLineNumber();

        return new monaco.Selection(line, this.right + 1, line, this.right + 1);
    }
}

export class StartOfLineTkn extends Token {
    isEmpty = false;

    constructor(root?: CodeConstruct, indexInRoot?: number) {
        super("");

        this.rootNode = root;
        this.indexInRoot = indexInRoot;
    }

    getNextEditableToken(): CodeConstruct {
        // should select the whole statement
        return this.rootNode;
    }

    getPrevEditableToken(): CodeConstruct {
        let parentStmt = this.getParentStatement();

        if (parentStmt.rootNode instanceof Statement && parentStmt.rootNode.hasBody()) {
            if (parentStmt.indexInRoot == 0) return parentStmt.rootNode.getEndOfLineToken();
            else return parentStmt.rootNode.body[parentStmt.indexInRoot - 1].getEndOfLineToken();
        } else if (parentStmt.rootNode instanceof Module) {
            if (parentStmt.indexInRoot > 0) {
                let lineAbove = parentStmt.rootNode.body[parentStmt.indexInRoot - 1];

                if (lineAbove instanceof EmptyLineStmt) return lineAbove;
                else return lineAbove.getEndOfLineToken();
            } else return this;
        }
    }

    getSelection(): monaco.Selection {
        let line = this.getLineNumber();

        return new monaco.Selection(line, this.left, line, this.left);
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

export class PunctuationTkn extends Token {
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
    body = new Array<Statement>();
    focusedNode: CodeConstruct;

	scope: Scope;
	editor: Editor;
	eventHandler: EventHandler;
	actionStack: ActionStack;
	buttons: HTMLElement[];
	notificationSystem: NotificationSystemController;

    constructor(editorId: string) {
        this.editor = new Editor(document.getElementById(editorId));

        this.body.push(new EmptyLineStmt(this, 0));
        this.scope = new Scope();
        this.focusedNode = this.body[0];
        this.focusedNode.build(new monaco.Position(1, 1));
        this.editor.monaco.focus();

        this.eventHandler = new EventHandler(this);

        this.actionStack = new ActionStack(this);

		this.notificationSystem = new NotificationSystemController(this.editor);

		this.buttons = [];
	}

    reset() {
        this.body = new Array<Statement>();

        this.body.push(new EmptyLineStmt(this, 0));
        this.scope = new Scope();
        this.focusedNode = this.body[0];
        this.focusedNode.build(new monaco.Position(1, 1));

        this.editor.reset();
        this.editor.monaco.focus();

        this.buttons.forEach((button) => button.remove());
        this.buttons = [];
    }

    addVariableButtonToToolbox(ref: VarAssignmentStmt) {
        let button = document.createElement("div");
        button.classList.add("button");
        button.id = ref.buttonId;

        document.getElementById("variables").appendChild(button);

        button.addEventListener("click", () => {
            this.insert(new VariableReferenceExpr(ref.getIdentifier(), ref.dataType, ref.buttonId));
        });

        this.buttons.push(button);
    }

    addLoopVariableButtonToToolbox(ref: ForStatement) {
        let button = document.createElement("div");
        button.classList.add("button");
        button.id = ref.buttonId;

        document.getElementById("variables").appendChild(button);

        button.addEventListener("click", () => {
            this.insert(new VariableReferenceExpr(ref.getIdentifier(), ref.dataType, ref.buttonId));
        });

        this.buttons.push(button);
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
            this.addLoopVariableButtonToToolbox(newStmt);
            newStmt.scope.references.push(new Reference(newStmt, this.scope));
        }
    }

    locateStatement(pos: monaco.Position): Statement {
        let stmt: Statement = null;

        for (let line of this.body) {
            stmt = line.getContainingSingleLineStatement(pos);

            if (stmt != null) return stmt;
        }

        throw new Error("The clicked position did not match any of the statements in the module.");
    }

    locateStatementAtLine(lineNumber: number): Statement {
        let stmt: Statement = null;

        for (let line of this.body) {
            stmt = line.getStatementAtLine(lineNumber);

            if (stmt != null) return stmt;
        }

        return null;
    }

    insertEmptyLine() {
        let curPos = this.editor.monaco.getPosition();
        let curStatement = this.locateStatement(curPos);

        let parentRoot = this.focusedNode.getParentStatement().rootNode;
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
            let emptyLine = new EmptyLineStmt(parentStmtHasBody ? parentRoot : this, curStatement.indexInRoot);

            emptyLine.build(curStatement.getLeftPosition());

            if (parentStmtHasBody)
                (parentRoot as Statement).addStatement(emptyLine, curStatement.indexInRoot, curStatement.lineNumber);
            else this.addStatement(emptyLine, curStatement.indexInRoot, curStatement.lineNumber);

            const range = new monaco.Range(curStatement.lineNumber - 1, 1, curStatement.lineNumber - 1, 1);
            this.editor.executeEdits(range, null, spaces + textToAdd);
        } else {
            // insert emptyStatement on next line, move other statements down
            let emptyLine = new EmptyLineStmt(parentStmtHasBody ? parentRoot : this, curStatement.indexInRoot + 1);
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
                this.focusedNode.right + 1,
                curStatement.lineNumber,
                this.focusedNode.right + 1
            );
            this.editor.executeEdits(range, null, textToAdd + spaces);

            this.focusedNode = emptyLine;
        }
    }

    replaceFocusedStatement(newStmt: Statement) {
        let curLineNumber = this.body[this.focusedNode.indexInRoot].lineNumber;

        this.body[this.focusedNode.indexInRoot] = newStmt;
        newStmt.rootNode = this.focusedNode.rootNode;
        newStmt.indexInRoot = this.focusedNode.indexInRoot;
        newStmt.init(this.focusedNode.getLeftPosition());

        if (newStmt.hasScope()) newStmt.scope.parentScope = this.scope;

        if (newStmt instanceof VarAssignmentStmt) {
            this.addVariableButtonToToolbox(newStmt);
            this.scope.references.push(new Reference(newStmt, this.scope));
        }

        if (newStmt instanceof ForStatement) {
            this.addLoopVariableButtonToToolbox(newStmt);
            newStmt.scope.references.push(new Reference(newStmt, this.scope));
        }

        if (newStmt.getHeight() > 1) this.rebuildBody(newStmt.indexInRoot + 1, curLineNumber + newStmt.getHeight());
    }

    rebuildBody(fromIndex: number, startLineNumber: number) {
        let lineNumber = startLineNumber;

        for (let i = fromIndex; i < this.body.length; i++) {
            if (this.body[i].hasBody()) this.body[i].rebuildBody(0, lineNumber);
            else this.body[i].setLineNumber(lineNumber);

            lineNumber += this.body[i].getHeight();
        }
    }

    replaceFocusedExpression(expr: Expression) {
        let root = this.focusedNode.rootNode as Statement;

        root.replace(expr, this.focusedNode.indexInRoot);
    }

    referenceTable = new Array<Reference>();

    insert(code: CodeConstruct) {
        if (code instanceof MethodCallExpr) {
            let focusedPos = this.editor.monaco.getPosition();
            let prevItem = this.focusedNode
                .getParentStatement()
                .locate(new monaco.Position(focusedPos.lineNumber, focusedPos.column - 1));

            if (prevItem instanceof Expression && prevItem.returns == code.calledOn/* TODO: and check calledOn */) {
                // will replace the expression with this
                // and will have the expression as the first element inside the code
                code.indexInRoot = prevItem.indexInRoot;
                code.rootNode = prevItem.rootNode;

                if (code.rootNode instanceof Expression || code.rootNode instanceof Statement) {
                    code.rootNode.replace(code, code.indexInRoot);
                }

                code.setExpression(prevItem);

                let range = new monaco.Range(
                    focusedPos.lineNumber,
                    code.left,
                    focusedPos.lineNumber,
                    focusedPos.column
                );

                //TODO: Maybe put into a method later for reusability. No good spot for it in the code right now though.
                if(this.focusedNode.notification){
                    this.notificationSystem.removeNotification(this.focusedNode);
                }

                this.editor.executeEdits(range, code);
                prevItem.rebuild(new monaco.Position(focusedPos.lineNumber, prevItem.left), 0);
            }
            else if(prevItem instanceof Expression && prevItem.returns != code.calledOn){
                //relies on tokens array not changing the index of function name
                this.notificationSystem.addHoverNotification(
                    this.focusedNode,
                    {
                        objectType: prevItem.returns,
                        method: (code.tokens[2] as FunctionNameTkn).text,
                        calledOn: code.calledOn
                    },
                    ErrorMessage.methodCallObjectTypeMismatch
                )
            }
        }

		if (code.addableType != AddableType.NotAddable && this.focusedNode.receives.indexOf(code.addableType) > -1) {
			let focusedPos = this.focusedNode.getLeftPosition();
			let parentStatement = this.focusedNode.getParentStatement();
			let parentRoot = parentStatement.rootNode;

			if (this.focusedNode.receives.indexOf(AddableType.Statement) > -1) {
				// replaces statement with the newly inserted statement
				let statement = code as Statement;

				if (parentRoot instanceof Statement && parentRoot.hasBody()) {
					if (code instanceof ElseStatement && parentRoot instanceof IfStatement) {
						if (parentRoot.isValidElseInsertion(this.focusedNode.indexInRoot, code)) {
							parentRoot.insertElseStatement(this.focusedNode.indexInRoot, code);

							let range = new monaco.Range(
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

                            if(this.focusedNode.notification){
                                this.notificationSystem.removeNotification(this.focusedNode);
                            }
                        }
                    } else if (!(statement instanceof ElseStatement)) {
                        parentRoot.replaceInBody(this.focusedNode.indexInRoot, statement);

						var range = new monaco.Range(
							focusedPos.lineNumber,
							code.left,
							focusedPos.lineNumber,
							code.right
						);

                        if(this.focusedNode.notification){
                            this.notificationSystem.removeNotification(this.focusedNode);
                        }
						this.editor.executeEdits(range, code);
					}
				} else if (!(statement instanceof ElseStatement)) {
					this.replaceFocusedStatement(statement);

					let range = new monaco.Range(
						focusedPos.lineNumber,
						statement.left,
						focusedPos.lineNumber,
						statement.right
					);

                    if(this.focusedNode.notification){
                        this.notificationSystem.removeNotification(this.focusedNode);
                    }

					this.editor.executeEdits(range, statement);
				}
			} else if (this.focusedNode.receives.indexOf(AddableType.Expression) > -1) {
				let isValid = true;

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

					if(!isValid){
						this.notificationSystem.addHoverNotification(this.focusedNode, {identifier: code.identifier}, ErrorMessage.outOfScopeVarReference);
					}
                    else{
                        if(this.focusedNode.notification){
                            this.notificationSystem.removeNotification(this.focusedNode);
                        }
                    }
				}

                //TODO: This should go inside a separate validator module
                //TODO: Need to add check for boolean ops
                //TODO: Need further differentiation for more detailed error messages since this notification will be
                //      created in many different scenarios (see below comment)
                //type check for bin. ops
                //needs to be checked when:
                //  1. code is a Literal or var or non-void return method or other expression
                //  2. AND the focusedNode is an EmptyExpr with rootNode being a BinaryOperatorExpr (or boolean)
                //  3. AND one of the EmptyExpr places is filled
                //code.returns holds the type of literal expression
                //focusedNode.tokens[leftOperandIndex] and focusedNode.tokens[rightOperandIndex] should hold the tokens for the literals
                //
                let existingLiteralType = null;

                //Binary operator type check (+ - * / < > <= >= ==)
                if((this.focusedNode.rootNode instanceof BinaryOperatorExpr || this.focusedNode.rootNode instanceof ComparatorExpr) && code instanceof Expression){
                    if (!(this.focusedNode.rootNode.tokens[this.focusedNode.rootNode.getLeftOperandIndex()] instanceof EmptyExpr)){
                        existingLiteralType = (this.focusedNode.rootNode.tokens[this.focusedNode.rootNode.getLeftOperandIndex()] as Expression).returns;
                    }
                    else if(!(this.focusedNode.rootNode.tokens[this.focusedNode.rootNode.getRightOperandIndex()] instanceof EmptyExpr)){
                        existingLiteralType = (this.focusedNode.rootNode.tokens[this.focusedNode.rootNode.getRightOperandIndex()] as Expression).returns;
                    }

                    if(existingLiteralType != null && existingLiteralType != code.returns){
                        if(this.focusedNode.rootNode instanceof BinaryOperatorExpr){
                            this.notificationSystem.addHoverNotification(this.focusedNode, {binOp: this.focusedNode.rootNode.operator, argType1: existingLiteralType, argType2: code.returns}, ErrorMessage.binOpArgTypeMismatch);
                        }
                        else if(this.focusedNode.rootNode instanceof ComparatorExpr){
                            this.notificationSystem.addHoverNotification(this.focusedNode, {binOp: this.focusedNode.rootNode.operator, argType1: existingLiteralType, argType2: code.returns}, ErrorMessage.compOpArgTypeMismatch);
                        }
                        isValid = false;
                    }
                }
                //boolean operator type check
                else if(this.focusedNode.rootNode instanceof BinaryBoolOperatorExpr && code instanceof Expression){
                    if(code.returns != DataType.Boolean){
                        isValid = false;
                        this.notificationSystem.addHoverNotification(this.focusedNode, {binOp: this.focusedNode.rootNode.operator, argType1: code.returns}, ErrorMessage.boolOpArgTypeMismatch);
                    }
                }
                //method argument type check
                //This could be made more generic to catch all type mismatches for all typed expressions.
                //But we still need the context of what type the parent statement is to create a more precise error message rather than
                //a generic "Type mismatch".
                //TODO: This will impact functions such as print() where the argument is set to be of type string, but could actually be anything that has a __string__() method otherwise it performs a generic conversion.
                //      Probably should make that argument type a list of acceptable types. Print() is special that way as far as built-in funcs. go, so maybe it is not worth the change.
                else if(this.focusedNode.rootNode instanceof FunctionCallStmt && this.focusedNode instanceof TypedEmptyExpr && code instanceof Expression){
                    if(code.returns != this.focusedNode.type){
                        isValid = false;
                        this.notificationSystem.addHoverNotification(this.focusedNode, {argType1: this.focusedNode.type, argType2: code.returns}, ErrorMessage.methodArgTypeMismatch);
                    }
                }

				if (isValid) {
                    if(this.focusedNode.notification){
                        this.notificationSystem.removeNotification(this.focusedNode);
                    }

					// replaces expression with the newly inserted expression
					let expr = code as Expression;

					this.replaceFocusedExpression(expr);

					let padding = 1;
					let selection = this.editor.monaco.getSelection();

					if (selection.endColumn == selection.startColumn) padding = 0;

					let range = new monaco.Range(
						focusedPos.lineNumber,
						this.focusedNode.left,
						focusedPos.lineNumber,
						this.focusedNode.right + padding
					);

					this.editor.executeEdits(range, expr);
				}
			}

            //TODO: This should probably run only if the insert above was successful, we cannot assume that it was
            if(!this.focusedNode.notification){
                this.focusedNode = code.nextEmptyToken();
                this.editor.focusSelection(this.focusedNode.getSelection());
            }

            //TODO: Need to remove old notification upon successful insert
		} else {
			console.warn("Cannot insert this code construct at focused location.");

            if(!this.focusedNode.notification){
                //TODO: This type of logic should not be inside the AST. It should be moved somewhere like a validator class or even the notification-system-controller.
                //However with the current architecture this is the best solution. The AST has all the information needed to make these decisions.
                //
                //(There is probably some code similar to this above as well)
                if(code.addableType == AddableType.NotAddable){
                    this.notificationSystem.addHoverNotification(this.focusedNode, {}, ErrorMessage.default);
                }
                else if(this.focusedNode.receives.indexOf(code.addableType) == -1){
                    if(this.focusedNode.rootNode instanceof Statement){
                        if(this.focusedNode.rootNode.getKeyword() != ""){
                            this.notificationSystem.addHoverNotification(this.focusedNode, {constructName: this.focusedNode.rootNode.getKeyword(), addedType: code.addableType},
                                                                         ErrorMessage.addableTypeMismatchControlStmt);
                        }
                        else{ //parent = VarAssignmentStmt || MethodCallStmt || EmptyLineStmt --although last one should not ever be present here
                            if(this.focusedNode.rootNode instanceof MethodCallStmt){
                                console.log("Address this once lists are fixed.")
                            }
                            else if(this.focusedNode.rootNode instanceof VarAssignmentStmt){
                                this.notificationSystem.addHoverNotification(this.focusedNode, {constructName: "Variable assignment", addedType: code.addableType},
                                                                             ErrorMessage.addableTypeMismatchVarAssignStmt);
                            }
                        }
                    }
                    else{ //Token
                        this.notificationSystem.addHoverNotification(this.focusedNode, {addedType: code.addableType},
                                                                             ErrorMessage.addableTypeMismatchEmptyLine);
                    }
                }
            }
		}
		this.editor.monaco.focus();
	}

	insertListItem() {
		if (this.focusedNode instanceof EmptyListItem) {
			let listExpr = this.focusedNode.rootNode as ListLiteralExpression;

			let text = listExpr.insertListItem(this.focusedNode.indexInRoot);

			let padding = 1;
			let selection = this.editor.monaco.getSelection();
			let focusedPos = this.editor.monaco.getPosition();

			if (selection.endColumn == selection.startColumn) padding = 0;

			let range = new monaco.Range(
				focusedPos.lineNumber,
				this.focusedNode.left,
				focusedPos.lineNumber,
				this.focusedNode.right + padding
			);

			this.editor.executeEdits(range, listExpr, text);
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
        let validReferences = this.getValidReferences(line);

        for (let ref of validReferences)
            if (
                (ref.statement instanceof VarAssignmentStmt && ref.statement.buttonId == uniqueId) ||
                (ref.statement instanceof ForStatement && ref.statement.buttonId == uniqueId)
            )
                return true;

        return false;
    }

    getValidReferences(line: number): Array<Reference> {
        let validReferences = this.references.filter((ref) => ref.line() < line);

        if (this.parentScope != null)
            validReferences = validReferences.concat(this.parentScope.getValidReferences(line));

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
