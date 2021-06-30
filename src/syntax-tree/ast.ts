import * as monaco from "monaco-editor";
import { EventRouter } from "../editor/event-router";
import { TAB_SPACES } from "./keywords";
import { Editor } from "../editor/editor";
import { EventStack as EventStack } from "../editor/event-stack";
import { NotificationSystemController } from "../notification-system/notification-system-controller";
import { ErrorMessage } from "../notification-system/error-msg-generator";
import { Notification } from "../notification-system/notification";
import { ConstructCompleter } from "../typing-system/construct-completer";
import { MenuController } from "../suggestions/suggestions-controller";
import { ConstructKeys, constructToToolboxButton, Util } from "../utilities/util";
import { Focus, Context, UpdatableContext } from "../editor/focus";
import { Hole } from "../editor/hole";
import { Validator } from "../editor/validator";

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
    focus,
    loseFocus,
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
        const line = this.getLineNumber();

        return new monaco.Selection(line, this.right, line, this.left);
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
    receives = new Array<AddableType>();
    left: number;
    right: number;
    text: string;
    isEmpty: boolean = false;
    callbacks = new Map<string, Array<Callback>>();
    notification = null;

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
        this.tokens.push(new TypedEmptyExpr(DataType.Boolean, this, this.tokens.length));
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
        this.tokens.push(new TypedEmptyExpr(DataType.Boolean, this, this.tokens.length));
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
            this.tokens.push(new TypedEmptyExpr(DataType.Boolean, this, this.tokens.length));
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
        this.tokens.push(new TypedEmptyExpr(DataType.List || DataType.String, this, this.tokens.length));
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
        this.tokens.push(new EmptyExpr(this, this.tokens.length));

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
                this.tokens.push(new TypedEmptyExpr(arg.type, this, this.tokens.length));

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

        if (args.length > 0) {
            this.tokens.push(new NonEditableTkn("." + functionName + "(", this, this.tokens.length));

            for (let i = 0; i < args.length; i++) {
                let arg = args[i];

                this.argumentsIndices.push(this.tokens.length);
                this.tokens.push(new TypedEmptyExpr(arg.type, this, this.tokens.length));

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

        this.tokens.push(new TypedEmptyExpr(DataType.List, this, this.tokens.length));
        this.tokens.push(new NonEditableTkn("[", this, this.tokens.length));
        this.tokens.push(new TypedEmptyExpr(DataType.Number, this, this.tokens.length));
        this.tokens.push(new NonEditableTkn("] = ", this, this.tokens.length));
        //TODO: Python lists allow elements of different types to be added to the same list. Should we keep that functionality?
        this.tokens.push(new EmptyExpr(this, this.tokens.length));
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
                this.tokens.push(new TypedEmptyExpr(arg.type, this, this.tokens.length));

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

        this.tokens.push(new TypedEmptyExpr(DataType.List, this, this.tokens.length));
        this.tokens.push(new NonEditableTkn("[", this, this.tokens.length));
        this.rightOperandIndex = this.tokens.length;
        this.tokens.push(new TypedEmptyExpr(DataType.Number, this, this.tokens.length));
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
        this.tokens.push(new TypedEmptyExpr(DataType.Any, this, this.tokens.length));
        this.tokens.push(new NonEditableTkn(" " + operator + " ", this, this.tokens.length));
        this.rightOperandIndex = this.tokens.length;
        this.tokens.push(new TypedEmptyExpr(DataType.Any, this, this.tokens.length));
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
        this.tokens.push(new TypedEmptyExpr(operatesOn, this, this.tokens.length));
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
        this.tokens.push(new EmptyExpr(this, this.tokens.length));
        this.tokens.push(new NonEditableTkn(" " + operator + " ", this, this.tokens.length));
        this.rightOperandIndex = this.tokens.length;
        this.tokens.push(new EmptyExpr(this, this.tokens.length));
        this.tokens.push(new NonEditableTkn(")", this, this.tokens.length));

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

        this.tokens.push(new NonEditableTkn("(", this, this.tokens.length));
        this.leftOperandIndex = this.tokens.length;
        this.tokens.push(new EmptyExpr(this, this.tokens.length));
        this.tokens.push(new NonEditableTkn(" " + operator + " ", this, this.tokens.length));
        this.rightOperandIndex = this.tokens.length;
        this.tokens.push(new EmptyExpr(this, this.tokens.length));
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
}

export class ListLiteralExpression extends Expression {
    addableType = AddableType.Expression;

    constructor(root?: CodeConstruct, indexInRoot?: number) {
        super(DataType.List);

        this.rootNode = root;
        this.indexInRoot = indexInRoot;

        this.tokens.push(new NonEditableTkn("[", this, this.tokens.length));
        this.tokens.push(new EmptyExpr(this, this.tokens.length));
        this.tokens.push(new NonEditableTkn("]", this, this.tokens.length));

        this.hasEmptyToken = true;
    }

    // rebuildTokensIndices() {
    //     for (let i = 0; i < this.tokens.length; i++) this.tokens[i].indexInRoot = i;
    // }

    // replace(code: CodeConstruct, index: number) {
    //     const curToken = this.tokens[index];

    //     // replace with: empty + expr + empty
    //     if (curToken instanceof EmptyListItem && curToken.isEmptyExpression) {
    //         let rebuildColumn: number;

    //         if (this.tokens[index] instanceof Token || (this.tokens[index] as Expression))
    //             rebuildColumn = this.tokens[index].left;

    //         code.rootNode = this;
    //         this.tokens.splice(index, 1, new EmptyListItem(false, this), code, new EmptyListItem(false, this));

    //         this.rebuildTokensIndices();
    //         this.updateHasEmptyToken(code);

    //         if (rebuildColumn != undefined) this.rebuild(new monaco.Position(this.lineNumber, rebuildColumn), index);

    //         this.notify(CallbackType.replace);
    //     } else super.replace(code, index);
    // }

    // insertListItem(index: number, value?: number): string {
    //     let expr;
    //     let insertedText = "";
    //     let rebuildColumn: number;

    //     if (this.tokens[index] instanceof Token || (this.tokens[index] as Expression))
    //         rebuildColumn = this.tokens[index].left;

    //     if (value != undefined) expr = new LiteralValExpr(DataType.Number, value.toString(), this);
    //     else expr = new EmptyExpr(this);

    //     if (index + 2 == this.tokens.length) {
    //         // if emptyList right before closing bracket => replace emptyList with: separator + empty + expr + empty
    //         this.tokens.splice(
    //             index,
    //             1,
    //             new NonEditableTkn(", ", this),
    //             new EmptyListItem(false, this),
    //             expr,
    //             new EmptyListItem(false, this)
    //         );

    //         insertedText = ", " + expr.getRenderText();
    //     } else {
    //         // o.w. => replace emptyList with: empty + expr + empty + separator
    //         this.tokens.splice(
    //             index,
    //             1,
    //             new EmptyListItem(false, this),
    //             expr,
    //             new EmptyListItem(false, this),
    //             new NonEditableTkn(", ", this)
    //         );

    //         insertedText = expr.getRenderText() + ", ";
    //     }

    //     this.rebuildTokensIndices();
    //     this.updateHasEmptyToken(expr);

    //     if (rebuildColumn != undefined) this.rebuild(new monaco.Position(this.lineNumber, rebuildColumn), index);

    //     this.notify(CallbackType.change);

    //     return insertedText;
    // }
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
    type: DataType;

    constructor(type: DataType, root?: CodeConstruct, indexInRoot?: number) {
        super("   ");

        this.rootNode = root;
        this.indexInRoot = indexInRoot;
        this.type = type;

        this.receives.push(AddableType.Expression);
    }
}

export class EmptyExpr extends Token {
    isEmpty = true;

    constructor(root?: CodeConstruct, indexInRoot?: number, text?: string) {
        super(text == undefined ? "   " : text);

        this.rootNode = root;
        this.indexInRoot = indexInRoot;

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
    body = new Array<Statement>();
    focus: Focus;
    validator: Validator;

    scope: Scope;
    editor: Editor;
    eventRouter: EventRouter;
    eventStack: EventStack;
    variableButtons: HTMLElement[];
    notificationSystem: NotificationSystemController;
    constructCompleter: ConstructCompleter;
    menuController: MenuController;

    constructor(editorId: string) {
        this.editor = new Editor(document.getElementById(editorId), this);
        this.focus = new Focus(this);
        this.validator = new Validator(this);

        this.focus.subscribeCallback((c: Context) => {
            Hole.disableEditableHoleOutlines();
            Hole.outlineTextEditableHole(c);
        });

        //TODO: Don't know where functionality like this should go, but once we decide on that, it would be better to rafactor this one to
        //use methods like above code
        this.focus.subscribeCallback(
            ((c: Context) => {
                const focusedNode = c.token && c.selected ? c.token : c.lineStatement;
                const validInserts = this.getAllValidInsertsList(focusedNode);

                Object.keys(ConstructKeys).forEach((construct) => {
                    if (constructToToolboxButton.has(ConstructKeys[construct])) {
                        if (validInserts.indexOf(ConstructKeys[construct]) == -1) {
                            const button = document.getElementById(
                                constructToToolboxButton.get(ConstructKeys[construct])
                            ) as HTMLButtonElement;
                            button.disabled = true;
                            button.classList.add("disabled");
                        } else {
                            const button = document.getElementById(
                                constructToToolboxButton.get(ConstructKeys[construct])
                            ) as HTMLButtonElement;
                            button.disabled = false;
                            button.classList.remove("disabled");
                        }
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
        this.constructCompleter = ConstructCompleter.getInstance();
        this.constructCompleter.setInstanceContext(this, this.editor);

        this.variableButtons = [];

        this.menuController = MenuController.getInstance();
        this.menuController.setInstance(this, this.editor);
    }

    insertAfterIndex(before: CodeConstruct, index: number, items: Array<CodeConstruct>) {
        if (before instanceof Token) {
            const root = before.rootNode;

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

        button.addEventListener("click", this.addVarRefHandler(ref).bind(this));

        this.variableButtons.push(button);
    }

    addVarRefHandler(ref: VarAssignmentStmt) {
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
                (context.token as TypedEmptyExpr).type === DataType.Boolean) ||
            //TODO: This case needs to be extended further since this is not always possible
            //      For example: randint(1, 2) cannot become randint(1 > 2, 2)
            //      Parent needs to be involved in the check
            //left or right is an expression
            context.expressionToLeft.returns === DataType.Number ||
            context.expressionToRight.returns === DataType.Number ||
            //equals can compare types other than Number (of course >, >=, < and <= also operate on types other than Number, but ignore that for now since our tool likely does not need it)
            (context.expressionToLeft && context.expressionToRight && insertEquals)
        );

        //randint(1 >, ---)
        //print(1) ==> print(1 > 2)
    }

    //Return a list of variable references available to be inserted into "code"
    getValidVariableReferences(code: CodeConstruct): Reference[] {
        let refs = [];

        try {
            if (code instanceof TypedEmptyExpr) {
                let scope = code.getParentStatement()?.scope; //line that contains "code"
                let currRootNode = code.rootNode;

                while (!scope) {
                    if (currRootNode.getParentStatement()?.hasScope()) {
                        scope = currRootNode.getParentStatement().scope;
                    } else if (currRootNode.rootNode instanceof Statement) {
                        currRootNode = currRootNode.rootNode;
                    } else if (currRootNode.rootNode instanceof Module) {
                        scope = currRootNode.rootNode.scope;
                    }
                }

                refs.push(...scope.getValidReferences(code.getSelection().startLineNumber));

                refs = refs.filter(
                    (ref) =>
                        ref.statement instanceof VarAssignmentStmt &&
                        (code.type == (ref.statement as VarAssignmentStmt).dataType || code.type == DataType.Any)
                );
            }
        } catch (e) {
            console.error("Unable to get valid variable references for " + code + "\n\n" + e);
        } finally {
            return refs;
        }
    }

    getAllValidInsertsMap(focusedNode: CodeConstruct): Map<ConstructKeys, boolean> {
        const validInserts = new Map<ConstructKeys, boolean>();

        try {
            Object.keys(ConstructKeys).forEach((key) => {
                validInserts.set(
                    ConstructKeys[key],
                    this.tryInsert(focusedNode, Util.getInstance(this).dummyToolboxConstructs.get(ConstructKeys[key]))
                );
            });
        } catch (e) {
            console.error("Unable to get valid inserts map for " + focusedNode + "\n\n" + e);
        } finally {
            return validInserts;
        }
    }

    getAllValidInsertsList(focusedNode: CodeConstruct): Array<ConstructKeys> {
        const validInsertsList = [];

        try {
            Object.keys(ConstructKeys).forEach((key) => {
                if (
                    this.tryInsert(focusedNode, Util.getInstance(this).dummyToolboxConstructs.get(ConstructKeys[key]))
                ) {
                    validInsertsList.push(ConstructKeys[key]);
                }
            });
        } catch (e) {
            console.error("Unable to get valid inserts list for " + focusedNode + "\n\n" + e);
        } finally {
            return validInsertsList;
        }
    }

    getValidInsertsFromSet(focusedNode: CodeConstruct, insertSet: Array<ConstructKeys>) {
        const validInserts = this.getAllValidInsertsMap(focusedNode);

        return insertSet.filter((insertionCandidate) => validInserts.get(insertionCandidate));
    }

    //code = insert, insertInto = focusedNode
    tryInsert(insertInto: CodeConstruct, insert: CodeConstruct) {
        if (!insertInto || !insert) {
            console.error(
                "Failed to perform insertion check on\n   insertInto: " + insertInto + "\n   insert: " + insert
            );
            return;
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

                if (insert.rootNode instanceof Expression || insert.rootNode instanceof Statement) return true;
            } else if (prevItem instanceof Expression && prevItem.returns != insert.calledOn) return false;
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
                        if (parentRoot.isValidElseInsertion(insertInto.indexInRoot, insert)) return true;
                    } else if (!(statement instanceof ElseStatement)) return true;
                } else if (!(statement instanceof ElseStatement)) return true;
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

                    if (!isValid) return false;

                    return true;
                }

                //type checks -- different handling based on type of code construct
                //insertInto.returns != code.returns would work, but we need more context to get the right error message
                if (isValid && insertInto instanceof TypedEmptyExpr && insert instanceof Expression) {
                    if (insertInto.rootNode instanceof BinaryBoolOperatorExpr) {
                        if (insert.returns != DataType.Boolean) return false;

                        return true;
                    }
                    //for-loop check is special since Iterable does not cover both str and list right now
                    //can change it once the types are an array
                    else if (insertInto.rootNode instanceof ForStatement) {
                        if (insert.returns != DataType.List && insert.returns != DataType.String) return false;

                        return true;
                    } else {
                        isValid = insertInto.type === insert.returns || insertInto.type === DataType.Any;

                        if (!isValid) return false;

                        return true;
                    }
                }

                //type check for binary ops (separate from above because they don't use TypedEmptyExpressions)
                let existingLiteralType = null;

                if (
                    (insertInto.rootNode instanceof BinaryOperatorExpr ||
                        insertInto.rootNode instanceof ComparatorExpr) &&
                    insert instanceof Expression
                ) {
                    if (!(insertInto.rootNode.tokens[insertInto.rootNode.getLeftOperandIndex()] instanceof EmptyExpr)) {
                        existingLiteralType = (
                            insertInto.rootNode.tokens[insertInto.rootNode.getLeftOperandIndex()] as Expression
                        ).returns;
                    } else if (
                        !(insertInto.rootNode.tokens[insertInto.rootNode.getRightOperandIndex()] instanceof EmptyExpr)
                    ) {
                        existingLiteralType = (
                            insertInto.rootNode.tokens[insertInto.rootNode.getRightOperandIndex()] as Expression
                        ).returns;
                    }

                    if (!existingLiteralType && insertInto.rootNode.returns === DataType.Any) {
                        insertInto.rootNode.returns = insert.returns;
                    } else if (existingLiteralType && insertInto.rootNode.returns === DataType.Any) {
                        insertInto.rootNode.returns = existingLiteralType;
                    }

                    if (existingLiteralType != null && existingLiteralType != insert.returns) return false;

                    return true;
                }

                if (insertInto.rootNode instanceof BinaryBoolOperatorExpr && insert instanceof Expression) {
                    if (insert.returns != DataType.Boolean) return false;

                    return true;
                }

                return true;
            }
        } else return false;
    }

    ///------------------VALIDATOR END

    insert(code: CodeConstruct, insertInto?: CodeConstruct) {
        //TODO: Probably want an overload of insert to take care of this case
        let focusedNodeProvided = false;
        let focusedNode = null;

        if (insertInto) {
            focusedNode = focusedNode;
            focusedNodeProvided = true;
        }

        const context = this.focus.getContext();
        focusedNode = this.focus.onEmptyLine() ? context.lineStatement : context.token;

        if (focusedNode) {
            if (code instanceof MethodCallExpr) {
                //const focusedPos = this.editor.monaco.getPosition();
                const focusedPos = context.position;
                const prevItem = context.token
                    .getParentStatement()
                    .locate(new monaco.Position(focusedPos.lineNumber, focusedPos.column - 1));

                /*const prevItem = this.focusedNode
                    .getParentStatement()
                    .locate(new monaco.Position(focusedPos.lineNumber, focusedPos.column - 1));*/

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
                        ErrorMessage.methodCallObjectTypeMismatch
                    );
                }
            }

            if (code.addableType != AddableType.NotAddable && focusedNode.receives.indexOf(code.addableType) > -1) {
                //const focusedPos = this.focusedNode.getLeftPosition();

                //we don't always insert into a token, sometimes it may be an empty line
                const focusedPos = this.focus.onEmptyLine()
                    ? context.lineStatement.getLeftPosition()
                    : context.token.getLeftPosition();

                // TODO: validations => context.token.isEmpty

                const parentStatement = context.lineStatement;
                //const parentStatement = this.focusedNode.getParentStatement();
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

                        if (!isValid) {
                            //TODO: Refactor to have this be built in an easier way. So for this line, make it shorter and maybe also use Builder in Notificaiton.ts
                            this.notificationSystem.addHoverNotifVarOutOfScope(
                                focusedNode,
                                { identifier: code.identifier },
                                ErrorMessage.outOfScopeVarReference,
                                parentRoot instanceof Module || parentRoot instanceof Statement
                                    ? parentRoot.scope
                                    : null,
                                focusedPos
                            );
                        }

                        if (isValid && focusedNode.notification) {
                            this.notificationSystem.removeNotificationFromConstruct(focusedNode);
                        }
                    }

                    //type checks -- different handling based on type of code construct
                    //focusedNode.returns != code.returns would work, but we need more context to get the right error message
                    if (isValid && focusedNode instanceof TypedEmptyExpr && code instanceof Expression) {
                        if (focusedNode.rootNode instanceof BinaryBoolOperatorExpr) {
                            if (code.returns != DataType.Boolean) {
                                isValid = false;
                                this.notificationSystem.addHoverNotification(
                                    focusedNode,
                                    { binOp: focusedNode.rootNode.operator, argType1: code.returns },
                                    ErrorMessage.boolOpArgTypeMismatch
                                );
                            }
                        }
                        //for-loop check is special since Iterable does not cover both str and list right now
                        //can change it once the types are an array
                        else if (focusedNode.rootNode instanceof ForStatement) {
                            if (code.returns != DataType.List && code.returns != DataType.String) {
                                isValid = false;
                                this.notificationSystem.addHoverNotification(
                                    focusedNode,
                                    {
                                        addedType: code.returns,
                                        constructName: (focusedNode.rootNode as Statement).getKeyword(),
                                        expectedType: focusedNode.type,
                                    },
                                    ErrorMessage.exprTypeMismatch
                                );
                            }
                        } else {
                            isValid = focusedNode.type === code.returns || focusedNode.type === DataType.Any;

                            //TODO: Need to fix type inferencing so that there is a better way to do this
                            //Currently you can insert arithmetic operators in places where only booleans are expected such as if-conditions.
                            //Removing the inner if check will make the user unable to insert anything in the binary expression that is not a boolean.
                            //assign operand types based on argument type for expressions being used as args
                            if (
                                !isValid &&
                                focusedNode instanceof TypedEmptyExpr &&
                                code instanceof BinaryOperatorExpr
                            ) {
                                isValid = true;

                                if (focusedNode.rootNode instanceof BinaryOperatorExpr) {
                                    (code.tokens[code.getLeftOperandIndex()] as TypedEmptyExpr).type = focusedNode.type;
                                    (code.tokens[code.getRightOperandIndex()] as TypedEmptyExpr).type =
                                        focusedNode.type;
                                }
                            }

                            if (!isValid) {
                                //within method arguments
                                if (focusedNode.rootNode instanceof FunctionCallStmt) {
                                    this.notificationSystem.addHoverNotification(
                                        focusedNode,
                                        {
                                            argType1: focusedNode.type,
                                            argType2: code.returns,
                                            methodName: focusedNode.rootNode.getFunctionName(),
                                        },
                                        ErrorMessage.methodArgTypeMismatch
                                    );
                                }
                                //within statements while, if, else if and second part of for
                                else if (focusedNode.rootNode instanceof Statement) {
                                    this.notificationSystem.addHoverNotification(
                                        focusedNode,
                                        {
                                            addedType: code.returns,
                                            constructName: (focusedNode.rootNode as Statement).getKeyword(),
                                            expectedType: focusedNode.type,
                                        },
                                        ErrorMessage.exprTypeMismatch
                                    );
                                }
                            }
                        }
                    }

                    //type check for binary ops (separate from above because they don't use TypedEmptyExpressions)
                    let existingLiteralType = null;

                    if (
                        (focusedNode.rootNode instanceof BinaryOperatorExpr ||
                            focusedNode.rootNode instanceof ComparatorExpr) &&
                        code instanceof Expression
                    ) {
                        if (
                            !(
                                focusedNode.rootNode.tokens[focusedNode.rootNode.getLeftOperandIndex()] instanceof
                                EmptyExpr
                            )
                        ) {
                            existingLiteralType = (
                                focusedNode.rootNode.tokens[focusedNode.rootNode.getLeftOperandIndex()] as Expression
                            ).returns;
                        } else if (
                            !(
                                focusedNode.rootNode.tokens[focusedNode.rootNode.getRightOperandIndex()] instanceof
                                EmptyExpr
                            )
                        ) {
                            existingLiteralType = (
                                focusedNode.rootNode.tokens[focusedNode.rootNode.getRightOperandIndex()] as Expression
                            ).returns;
                        }

                        if (!existingLiteralType && focusedNode.rootNode.returns === DataType.Any) {
                            focusedNode.rootNode.returns = code.returns;
                        } else if (existingLiteralType && focusedNode.rootNode.returns === DataType.Any) {
                            focusedNode.rootNode.returns = existingLiteralType;
                        }

                        if (existingLiteralType != null && existingLiteralType != code.returns) {
                            isValid = false;

                            if (focusedNode.rootNode instanceof BinaryOperatorExpr) {
                                this.notificationSystem.addHoverNotification(
                                    focusedNode,
                                    {
                                        binOp: focusedNode.rootNode.operator,
                                        argType1: existingLiteralType,
                                        argType2: code.returns,
                                    },
                                    ErrorMessage.binOpArgTypeMismatch
                                );
                            } else if (focusedNode.rootNode instanceof ComparatorExpr) {
                                this.notificationSystem.addHoverNotification(
                                    focusedNode,
                                    {
                                        binOp: focusedNode.rootNode.operator,
                                        argType1: existingLiteralType,
                                        argType2: code.returns,
                                    },
                                    ErrorMessage.compOpArgTypeMismatch
                                );
                            }
                        }
                    }

                    if (focusedNode.rootNode instanceof BinaryBoolOperatorExpr && code instanceof Expression) {
                        if (code.returns != DataType.Boolean) {
                            isValid = false;
                            this.notificationSystem.addHoverNotification(
                                focusedNode,
                                {
                                    binOp: focusedNode.rootNode.operator,
                                    argType1: DataType.Boolean,
                                    argType2: code.returns,
                                },
                                ErrorMessage.compOpArgTypeMismatch
                            );
                        }
                    }

                    if (isValid) {
                        if (focusedNode.notification && context.selected) {
                            this.notificationSystem.removeNotificationFromConstruct(focusedNode);
                        }

                        // replaces expression with the newly inserted expression
                        const expr = code as Expression;

                        //update var type
                        //originally all var ref buttons are of type any
                        if (focusedNode.rootNode instanceof VarAssignmentStmt) {
                            const button = document.getElementById(focusedNode.rootNode.buttonId);
                            button.removeEventListener("click", this.addVarRefHandler(null), false);

                            (focusedNode.rootNode as VarAssignmentStmt).dataType = expr.returns;
                            button.addEventListener(
                                "click",
                                this.addVarRefHandler(focusedNode.rootNode as VarAssignmentStmt).bind(this)
                            );
                        }
                        //this is for when the expression that is assigned to the var was originally of type Any
                        //This is ok for BooleaExpr because they only allow booleans to be added to them anyway.
                        else if (
                            parentStatement instanceof VarAssignmentStmt &&
                            parentStatement.dataType == DataType.Any &&
                            !(
                                focusedNode.rootNode instanceof ComparatorExpr ||
                                // focusedNode instanceof EmptyListItem ||
                                focusedNode.rootNode instanceof ListLiteralExpression
                            )
                        ) {
                            const button = document.getElementById(parentStatement.buttonId);
                            button.removeEventListener("click", this.addVarRefHandler(null), false);

                            (parentStatement as VarAssignmentStmt).dataType = expr.returns;
                            button.addEventListener(
                                "click",
                                this.addVarRefHandler(parentStatement as VarAssignmentStmt).bind(this)
                            );
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

                    if (newContext.tokenToSelect != null) this.editor.focusSelection();

                    // TODO: remove this when done merging the nav.
                    try {
                        this.editor.focusSelection();
                    } catch (e) {
                        console.error("Could not focus selection:\n" + e);
                        this.editor.focusSelection();
                    }
                }
            } else {
                console.warn("Cannot insert this code construct at focused location.");

                //TODO: This type of logic should not be inside the  It should be moved somewhere like a validator class or even the notification-system-controller.
                //However with the current architecture this is the best solution. The AST has all the information needed to make these decisions.
                if (code.addableType == AddableType.NotAddable) {
                    this.notificationSystem.addHoverNotification(focusedNode, {}, ErrorMessage.default);
                } else if (focusedNode.receives.indexOf(code.addableType) == -1) {
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
                                { addedType: code.addableType },
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
                                        ErrorMessage.methodArgTypeMismatch
                                    );
                                } else if (code instanceof Statement) {
                                    this.notificationSystem.addHoverNotification(
                                        focusedNode,
                                        { addedType: code.addableType },
                                        ErrorMessage.addableTypeMismatchMethodArg
                                    );
                                }
                            }
                        }
                    } else {
                        //Token
                        this.notificationSystem.addHoverNotification(
                            focusedNode,
                            { addedType: code.addableType },
                            ErrorMessage.addableTypeMismatchEmptyLine
                        );
                    }
                }
            }
            this.editor.monaco.focus();
        }
    }

    // insertListItem() {
    //     const focusedNode = this.focus.getContext()?.token;

    //     if (focusedNode instanceof EmptyListItem) {
    //         let padding = 1;
    //         const listExpr = focusedNode.rootNode as ListLiteralExpression;
    //         const text = listExpr.insertListItem(focusedNode.indexInRoot);
    //         const selection = this.editor.monaco.getSelection();
    //         const focusedPos = this.editor.monaco.getPosition();

    //         if (selection.endColumn == selection.startColumn) padding = 0;

    //         const range = new monaco.Range(
    //             focusedPos.lineNumber,
    //             focusedNode.left,
    //             focusedPos.lineNumber,
    //             focusedNode.right + padding
    //         );

    //         this.editor.executeEdits(range, listExpr, text);
    //     }
    // }
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
