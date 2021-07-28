import { Reference, Scope } from "./scope";
import { Module } from "./module";
import { rebuildBody } from "./body";
import * as monaco from "monaco-editor";
import { TypeChecker } from "./type-checker";
import { DraftRecord } from "../editor/draft";
import { Validator } from "../editor/validator";
import { Util, hasMatch } from "../utilities/util";
import { Callback, CallbackType } from "./callback";
import { InsertionType, TAB_SPACES } from "./consts";
import { Context, UpdatableContext } from "../editor/focus";
import { Notification } from "../notification-system/notification";
import { NotificationSystemController } from "../notification-system/notification-system-controller";
import {
    AddableType,
    BinaryOperator,
    BinaryOperatorCategory,
    DataType,
    UnaryOp,
    arithmeticOps,
    boolOps,
    comparisonOps,
} from "./consts";
import { ConstructName } from "../editor/enums";
import { VariableController } from "./variable-controller";

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

    codeConstructName: ConstructName;

    /**
     * Builds the left and right positions of this node and all of its children nodes recursively.
     * @param pos the left position to start building the nodes from
     * @returns the final right position of the whole node (calculated after building all of the children nodes)
     */
    build(pos: monaco.Position): monaco.Position;

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
    typeValidateInsertionIntoHole(
        insertCode: Expression,
        enableWarnings: boolean,
        insertInto?: TypedEmptyExpr,
        notifSystem?: NotificationSystemController
    ): boolean;

    /**
     * Actions that need to run after the construct has been validated for insertion, but before it is inserted into the AST.
     *
     * @param insertInto code to insert into
     * @param insertCode code being inserted
     */
    performPreInsertionUpdates(insertInto?: TypedEmptyExpr, insertCode?: Expression): void;

    onFocusOff(arg: any): void;

    performPostInsertionUpdates(insertInto?: TypedEmptyExpr, insertCode?: Expression): void;
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
    codeConstructName = ConstructName.Default;

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
            if (this.callbacks[type][i].callerId == callerId) {
                index = i;
                break;
            }
        }

        if (index >= 0) this.callbacks[type].splice(index, 1);
    }

    notify(type: CallbackType) {
        for (const callback of this.callbacks[type]) callback.callback();
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
            this.tokens[i].indexInRoot = i;
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
                (toReplace as Expression).tokens.forEach((token) => {
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

    /**
     * Return this statement's keyword if it has one. Otherwise return an empty string.
     *
     * @returns text representation of statement's keyword or an empty string if it has none
     */
    getKeyword(): string {
        if (this.keywordIndex > -1) return (this.tokens[this.keywordIndex] as KeywordTkn).text;

        return "";
    }

    typeValidateInsertionIntoHole(
        insertCode: Expression,
        enableWarnings: boolean,
        insertInto?: TypedEmptyExpr,
        notifSystem?: NotificationSystemController
    ): boolean {
        return insertInto.type.indexOf(insertCode.returns) > -1 || insertInto.type.indexOf(DataType.Any) > -1;
    }

    performPostInsertionUpdates(insertInto?: TypedEmptyExpr, insertCode?: Expression) {}

    performPreInsertionUpdates(insertInto?: TypedEmptyExpr, insertCode?: Expression) {}

    /**
     * Actions performed when a code construct is inserted within a hole of this code construct.
     *
     * @param insertCode code being inserted
     */
    onInsertInto(insertCode: CodeConstruct) {}

    validateContext(validator: Validator, providedContext: Context): boolean {
        return false;
    }

    //actions that need to occur when the focus is switched off of this statement
    onFocusOff(arg: any): void {
        return;
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
        else if (this.rootNode instanceof Expression) return this.rootNode.getLineNumber();
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

    typeValidateInsertionIntoHole(
        insertCode: Expression,
        enableWarnings: boolean,
        insertInto?: TypedEmptyExpr,
        notifSystem?: NotificationSystemController
    ): boolean {
        return super.typeValidateInsertionIntoHole(insertCode, enableWarnings, insertInto);
    }

    /**
     * Update types of holes within the expression as well as the expression's return type when insertCode is inserted into it.
     *
     * @param insertCode code being inserted.
     */
    performTypeUpdatesOnInsertInto(insertCode: Expression) {}

    /**
     * Update types of holes within the expression as well as the expression's return type to "type" when this expression is inserted into the AST.
     *
     * @param type new return/expression hole type
     */
    performTypeUpdatesOnInsertion(type: DataType) {}

    /**
     * Return whether this construct can be repalced with replaceWith.
     * Can replace a bin expression in only two cases
     *   1: replaceWith has the same return type
     *   2: replaceWith can be cast/modified to become the same type as the bin op being replaced
     */
    canReplaceWithConstruct(replaceWith: Expression): InsertionType {
        //when we are replacing at the top level (meaning the item above is a Statement),
        //we need to check types against the type of hole that used to be there and not the expression
        //that is currently there

        //Need exception for FunctionCallStmt because it inherits from Expression and not just Statement
        //Might need the same fix for MemberCallStmt in the future, but it does not work right now so cannot check
        if (
            (!(this.rootNode instanceof Expression) || this.rootNode instanceof FunctionCallStmt) &&
            !(this.rootNode instanceof Module)
        ) {
            const typesOfParentHole = (this.rootNode as Statement).typeOfHoles[this.indexInRoot];

            let canConvertToParentType = hasMatch(
                Util.getInstance(null).typeConversionMap.get(replaceWith.returns),
                typesOfParentHole
            );

            if (canConvertToParentType && !hasMatch(typesOfParentHole, [replaceWith.returns])) {
                return InsertionType.DraftMode;
            } else if (hasMatch(typesOfParentHole, [replaceWith.returns])) {
                return InsertionType.Valid;
            }
        } else {
            //when replacing within expression we need to check if the replacement can be cast into or already has the same type as the one being replaced
            if (replaceWith.returns === this.returns) {
                return InsertionType.Valid;
            } else if (
                replaceWith.returns !== this.returns &&
                hasMatch(Util.getInstance(null).typeConversionMap.get(replaceWith.returns), [this.returns])
            ) {
                return InsertionType.DraftMode;
            } else {
                return InsertionType.Invalid;
            }
        }
    }

    updateVariableType(dataType: DataType) {
        //TODO: This probably needs to be recursive since this won't catch nested expression type updates
        if (this.rootNode instanceof VarAssignmentStmt) {
            this.rootNode.dataType = dataType;
        } else if (this.rootNode instanceof ForStatement) {
            this.rootNode.loopVar.dataType = TypeChecker.getElementTypeFromListType(dataType);
        }
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
    draftModeEnabled = false;
    draftRecord = null;
    codeConstructName = ConstructName.Default;

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

    typeValidateInsertionIntoHole(
        insertCode: Expression,
        enableWarnings: boolean,
        insertInto?: TypedEmptyExpr,
        notifSystem?: NotificationSystemController
    ): boolean {
        return false;
    }

    performPreInsertionUpdates(insertInto?: TypedEmptyExpr, insertCode?: Expression) {}

    onFocusOff(arg: any): void {
        return;
    }

    performPostInsertionUpdates(insertInto?: TypedEmptyExpr, insertCode?: Expression) {}
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

    validateContext(validator: Validator, providedContext: Context): boolean {
        return validator.onEmptyLine(providedContext);
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

    validateContext(validator: Validator, providedContext: Context): boolean {
        return validator.onEmptyLine(providedContext);
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

        rebuildBody(this, index + 1, prevPos.lineNumber + 1);
    }

    typeValidateInsertionIntoHole(
        insertCode: Expression,
        enableWarnings: boolean,
        insertInto?: TypedEmptyExpr,
        notifSystem?: NotificationSystemController
    ): boolean {
        const isValidType = super.typeValidateInsertionIntoHole(insertCode, enableWarnings, insertInto);

        if (enableWarnings && !isValidType) {
            notifSystem.addStatementHoleTypeMismatchWarning(insertInto, insertInto, insertCode);
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

    validateContext(validator: Validator, providedContext: Context): boolean {
        return (
            validator.onEmptyLine(providedContext) &&
            (this.hasCondition
                ? validator.canInsertElifStatement(providedContext)
                : validator.canInsertElseStatement(providedContext))
        );
    }

    replaceCondition(expr: Expression) {
        if (this.hasCondition) this.replace(expr, this.conditionIndex);
    }
}

export interface VariableContainer {
    assignId();

    assignVariable(varController: VariableController, currentIdentifierAssignments: Statement[]);

    assignNewVariable(varController: VariableController);

    assignExistingVariable(currentIdentifierAssignments: Statement[]);

    reassignVar(
        oldVarId: string,
        varController: VariableController,
        currentIdentifierAssignments: Statement[],
        oldIdentifierAssignments: Statement[]
    );
}

export class ForStatement extends Statement implements VariableContainer {
    addableType = AddableType.Statement;

    buttonId: string;
    private counterIndex: number;
    private rangeIndex: number;

    loopVar: VarAssignmentStmt = null;

    //TODO: Statements should not have a data type?
    dataType = DataType.Any;

    constructor(root?: CodeConstruct | Module, indexInRoot?: number) {
        super();

        this.buttonId = "";

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

        this.scope = new Scope();

        this.hasEmptyToken = true;

        this.loopVar = new VarAssignmentStmt();
        this.loopVar.rootNode = this;

        this.subscribe(
            CallbackType.onFocusOff,
            new Callback(() => {
                this.onFocusOff();
            })
        );

        this.subscribe(
            CallbackType.delete,
            new Callback(() => {
                this.onDelete();
            })
        );
    }

    validateContext(validator: Validator, providedContext: Context): boolean {
        return validator.onEmptyLine(providedContext);
    }

    rebuild(pos: monaco.Position, fromIndex: number) {
        super.rebuild(pos, fromIndex);
        //this.updateButton();
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

    typeValidateInsertionIntoHole(
        insertCode: Expression,
        enableWarnings: boolean,
        insertInto?: TypedEmptyExpr,
        notifSystem?: NotificationSystemController
    ): boolean {
        const isValidType = insertInto.type.indexOf(insertCode.returns) > -1;

        if (enableWarnings && !isValidType) {
            notifSystem.addStatementHoleTypeMismatchWarning(insertInto, insertInto, insertCode);
        }

        return isValidType;
    }

    onFocusOff(): void {
        if (!this.loopVar.lineNumber) {
            this.loopVar.lineNumber = this.lineNumber;
        }

        const currentIdentifier = this.getIdentifier();
        const oldIdentifier = this.loopVar.getOldIdentifier();
        const varController = this.getModule().variableController;

        if (currentIdentifier !== oldIdentifier) {
            const currentIdentifierAssignments = this.scope.getAllVarAssignmentsToNewVar(
                currentIdentifier,
                this.getModule(),
                this.lineNumber,
                this.loopVar
            );

            const oldIdentifierAssignments = (this.rootNode as Statement | Module).scope.getAllVarAssignmentsToNewVar(
                oldIdentifier,
                this.getModule(),
                this.lineNumber,
                this.loopVar
            );

            //assignment of a new variable using an empty VarAssignmentStmt
            if (this.buttonId === "") {
                this.assignVariable(varController, currentIdentifierAssignments);
            } else {
                this.reassignVar(this.buttonId, varController, currentIdentifierAssignments, oldIdentifierAssignments);
            }

            //TODO: Same as the comment in VarAssignmentStmt
            varController.updateButtonsInsertionType();
        }
    }

    assignId() {
        if (this.buttonId === "") {
            this.buttonId = "add-var-ref-" + VarAssignmentStmt.uniqueId;
            this.loopVar.buttonId = this.buttonId;
            VarAssignmentStmt.uniqueId++;
        }
    }

    assignVariable(varController: VariableController, currentIdentifierAssignments: Statement[]) {
        if (currentIdentifierAssignments.length === 0) {
            this.assignNewVariable(varController);
        } else if (currentIdentifierAssignments.length > 0) {
            this.assignExistingVariable(currentIdentifierAssignments);
        }
    }

    assignNewVariable(varController: VariableController) {
        this.assignId();
        varController.addVariableRefButton(this.loopVar);
        this.loopVar.setIdentifier(this.getIdentifier(), this.getIdentifier());
        this.getModule().processNewVariable(
            this,
            this.rootNode instanceof Module || this.rootNode instanceof Statement ? this.rootNode.scope : null
        );

        this.getModule().variableController.updateVarButtonWithType(
            this.buttonId,
            this.scope ?? (this.rootNode as Module | Statement).scope, //NOTE: You just need the closest parent scope, but I think in all cases it will be the scope of the root node since we are either inside of the Module's body or another statement's
            this.lineNumber,
            this.getIdentifier()
        );
    }

    assignExistingVariable(currentIdentifierAssignments: Statement[]) {
        const statement =
            currentIdentifierAssignments[0] instanceof VarAssignmentStmt
                ? currentIdentifierAssignments[0]
                : (currentIdentifierAssignments[0] as ForStatement).loopVar;

        this.buttonId = statement.buttonId;
    }

    reassignVar(
        oldVarId: string,
        varController: VariableController,
        currentIdentifierAssignments: Statement[],
        oldIdentifierAssignments: Statement[]
    ) {
        //just removed last assignment to the old var
        if (oldIdentifierAssignments.length === 0) {
            varController.removeVariableRefButton(oldVarId);
        }

        if (currentIdentifierAssignments.length === 0) {
            //variable being reassigned to is a new variable
            this.buttonId = "";
            this.assignNewVariable(varController);
        } else if (currentIdentifierAssignments.length > 0) {
            //variable being reassigned to already exists
            this.assignExistingVariable(currentIdentifierAssignments);
        }
    }

    onInsertInto(insertCode: Expression) {
        if (insertCode instanceof ListLiteralExpression) {
            this.loopVar.dataType = TypeChecker.getElementTypeFromListType(insertCode.returns);
        } else {
            this.loopVar.dataType = insertCode.returns;
        }
    }

    private onDelete() {
        const varController = this.getModule().variableController;
        const assignments = (this.rootNode as Statement | Module).scope.getAllAssignmentsToVariableWithinScope(
            this.getIdentifier(),
            this
        );

        if (assignments.length === 0) {
            varController.removeVariableRefButton(this.buttonId);
            varController.addWarningToVarRefs(this.buttonId, this.getModule());
        }
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

    validateContext(validator: Validator, providedContext: Context): boolean {
        return validator.onEmptyLine(providedContext);
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
}

export class VarAssignmentStmt extends Statement implements VariableContainer {
    static uniqueId: number = 0;
    buttonId: string = ""; //note: this is used as both the DOM id of the reference button in the toolbox AND the unique id of the variable itself
    addableType = AddableType.Statement;
    private identifierIndex: number;
    private valueIndex: number;
    dataType = DataType.Any;
    codeConstructName = ConstructName.VarAssignment;
    private oldIdentifier: string;

    constructor(id?: string, root?: CodeConstruct | Module, indexInRoot?: number) {
        super();

        this.rootNode = root;
        this.indexInRoot = indexInRoot;

        this.identifierIndex = this.tokens.length;
        this.tokens.push(new IdentifierTkn(id, this, this.tokens.length));
        this.tokens.push(new NonEditableTkn(" = ", this, this.tokens.length));
        this.valueIndex = this.tokens.length;
        this.tokens.push(new TypedEmptyExpr([DataType.Any], this, this.tokens.length));
        this.typeOfHoles[this.tokens.length - 1] = [DataType.Any];

        this.oldIdentifier = this.getIdentifier();

        this.hasEmptyToken = true;

        this.subscribe(
            CallbackType.onFocusOff,
            new Callback(() => {
                this.onFocusOff();
            })
        );

        this.subscribe(
            CallbackType.delete,
            new Callback(() => {
                this.onDelete();
            })
        );
    }

    validateContext(validator: Validator, providedContext: Context): boolean {
        return validator.onEmptyLine(providedContext);
    }

    replaceIdentifier(code: CodeConstruct) {
        this.oldIdentifier = this.getIdentifier();

        this.replace(code, this.identifierIndex);
    }

    replaceValue(code: CodeConstruct) {
        this.replace(code, this.valueIndex);
    }

    rebuild(pos: monaco.Position, fromIndex: number) {
        super.rebuild(pos, fromIndex);
    }

    getIdentifier(): string {
        return this.tokens[this.identifierIndex].getRenderText();
    }

    getOldIdentifier(): string {
        return this.oldIdentifier;
    }

    updateButton(): void {
        document.getElementById(this.buttonId).innerHTML = this.getIdentifier();
    }

    setIdentifier(identifier: string, oldIdentifier?: string) {
        this.oldIdentifier = oldIdentifier ?? this.getIdentifier();

        (this.tokens[this.identifierIndex] as IdentifierTkn).setIdentifierText(identifier);
        this.updateButton();
    }

    onFocusOff(): void {
        const currentIdentifier = this.getIdentifier();
        const varController = this.getModule().variableController;

        if (currentIdentifier !== this.oldIdentifier) {
            const currentIdentifierAssignments = (
                this.rootNode as Statement | Module
            ).scope.getAllVarAssignmentsToNewVar(currentIdentifier, this.getModule(), this.lineNumber, this);

            const oldIdentifierAssignments = (this.rootNode as Statement | Module).scope.getAllVarAssignmentsToNewVar(
                this.oldIdentifier,
                this.getModule(),
                this.lineNumber,
                this
            );

            //assignment of a new variable using an empty VarAssignmentStmt
            if (this.buttonId === "") {
                this.assignVariable(varController, currentIdentifierAssignments);
            } else {
                this.reassignVar(this.buttonId, varController, currentIdentifierAssignments, oldIdentifierAssignments);
            }

            this.oldIdentifier = currentIdentifier;

            //TODO: This updates all buttons, but we really only want to update the one attached to this var
            varController.updateButtonsInsertionType();
        }
    }

    assignId() {
        if (this.buttonId === "") {
            this.buttonId = "add-var-ref-" + VarAssignmentStmt.uniqueId;
            VarAssignmentStmt.uniqueId++;
        }
    }

    assignVariable(varController: VariableController, currentIdentifierAssignments: Statement[]) {
        if (currentIdentifierAssignments.length === 0) {
            this.assignNewVariable(varController);
        } else if (currentIdentifierAssignments.length > 0) {
            this.assignExistingVariable(currentIdentifierAssignments);
        }
    }

    assignNewVariable(varController: VariableController) {
        this.assignId();
        varController.addVariableRefButton(this);
        this.getModule().processNewVariable(
            this,
            this.rootNode instanceof Module || this.rootNode instanceof Statement ? this.rootNode.scope : null
        );

        this.getModule().variableController.updateVarButtonWithType(
            this.buttonId,
            this.scope ?? (this.rootNode as Module | Statement).scope, //NOTE: You just need the closest parent scope, but I think in all cases it will be the scope of the root node since we are either inside of the Module's body or another statement's
            this.lineNumber,
            this.getIdentifier()
        );
    }

    assignExistingVariable(currentIdentifierAssignments: Statement[]) {
        const statement =
            currentIdentifierAssignments[0] instanceof VarAssignmentStmt
                ? currentIdentifierAssignments[0]
                : (currentIdentifierAssignments[0] as ForStatement).loopVar;

        this.buttonId = statement.buttonId;

        //if we reassign above current line number, then we might have changed scopes
        if (this.lineNumber < statement.lineNumber && statement.rootNode !== this.rootNode) {
            (statement.rootNode as Module | Statement).scope.references.splice(
                (statement.rootNode as Module | Statement).scope.references
                    .map((ref) => ref.statement)
                    .indexOf(statement),
                1
            );
            (this.rootNode as Module | Statement).scope.references.push(
                new Reference(this, (this.rootNode as Module | Statement).scope)
            );
        } else if (this.lineNumber < statement.lineNumber && statement.rootNode === this.rootNode) {
            //scope is the same
            //in this case we need to update the reference to be the line above current one
            const scope = this.scope ?? (this.rootNode as Module | Statement).scope;
            scope.replaceReferenceStatement(statement, this);
        }
    }

    reassignVar(
        oldVarId: string,
        varController: VariableController,
        currentIdentifierAssignments: Statement[],
        oldIdentifierAssignments: Statement[]
    ) {
        //just removed last assignment to the old var
        if (oldIdentifierAssignments.length === 0) {
            varController.removeVariableRefButton(oldVarId);
        }

        if (currentIdentifierAssignments.length === 0) {
            //variable being reassigned to is a new variable
            this.buttonId = "";
            this.assignNewVariable(varController);
        } else if (currentIdentifierAssignments.length > 0) {
            //variable being reassigned to already exists
            this.assignExistingVariable(currentIdentifierAssignments);
        }
    }

    onInsertInto(insertCode: Expression) {
        if (insertCode instanceof ListLiteralExpression) {
            this.dataType = TypeChecker.getElementTypeFromListType(insertCode.returns);
        } else {
            this.dataType = insertCode.returns;
        }
    }

    private onDelete() {
        const varController = this.getModule().variableController;
        const assignments = (this.rootNode as Statement | Module).scope.getAllAssignmentsToVariableWithinScope(
            this.getIdentifier(),
            this
        );

        if (assignments.length === 0) {
            varController.removeVariableRefButton(this.buttonId);
            varController.addWarningToVarRefs(this.buttonId, this.getModule());
        }
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

    validateContext(validator: Validator, providedContext: Context): boolean {
        return validator.atEmptyExpressionHole(providedContext);
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

    validateContext(validator: Validator, providedContext: Context): boolean {
        return this.isStatement()
            ? validator.onEmptyLine(providedContext)
            : validator.atEmptyExpressionHole(providedContext);
    }

    replaceArgument(index: number, to: CodeConstruct) {
        this.replace(to, this.argumentsIndices[index]);
    }

    getFunctionName(): string {
        return this.functionName;
    }

    typeValidateInsertionIntoHole(
        insertCode: Expression,
        enableWarnings: boolean,
        insertInto?: TypedEmptyExpr,
        notifSystem?: NotificationSystemController
    ): boolean {
        const isValidType = super.typeValidateInsertionIntoHole(insertCode, enableWarnings, insertInto);

        if (enableWarnings && !isValidType) {
            notifSystem.addFunctionCallArgumentTypeMismatchWarning(insertInto, insertInto, insertCode);
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

    validateContext(validator: Validator, providedContext: Context): boolean {
        return validator.atRightOfExpression(providedContext);
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

    validateContext(validator: Validator, providedContext: Context): boolean {
        return validator.onEmptyLine(providedContext);
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

    validateContext(validator: Validator, providedContext: Context): boolean {
        return validator.onEmptyLine(providedContext);
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

    validateContext(validator: Validator, providedContext: Context): boolean {
        return validator.atEmptyExpressionHole(providedContext);
    }
}

export class BinaryOperatorExpr extends Expression {
    addableType = AddableType.Expression;
    operator: BinaryOperator;
    operatorCategory: BinaryOperatorCategory;
    private leftOperandIndex: number;
    private rightOperandIndex: number;

    constructor(operator: BinaryOperator, returns: DataType, root?: CodeConstruct, indexInRoot?: number) {
        super(returns);

        this.rootNode = root;
        this.indexInRoot = indexInRoot;
        this.operator = operator;

        if (arithmeticOps.indexOf(operator) > -1) {
            this.operatorCategory = BinaryOperatorCategory.Arithmetic;
        } else if (boolOps.indexOf(operator) > -1) {
            this.operatorCategory = BinaryOperatorCategory.Boolean;
        } else if (comparisonOps.indexOf(operator) > -1) {
            this.operatorCategory = BinaryOperatorCategory.Comparison;
        } else {
            this.operatorCategory = BinaryOperatorCategory.Unspecified;
        }

        this.addableType = AddableType.Expression;

        this.tokens.push(new NonEditableTkn("(", this, this.tokens.length));

        this.leftOperandIndex = this.tokens.length;
        if (this.operatorCategory === BinaryOperatorCategory.Arithmetic && operator == BinaryOperator.Add) {
            if (returns !== DataType.String && returns !== DataType.Number) {
                this.tokens.push(new TypedEmptyExpr([DataType.Number, DataType.String], this, this.tokens.length));
                this.typeOfHoles[this.tokens.length - 1] = [DataType.Number, DataType.String];
                this.tokens.push(new NonEditableTkn(" " + operator + " ", this, this.tokens.length));
                this.rightOperandIndex = this.tokens.length;
                this.tokens.push(new TypedEmptyExpr([DataType.Number, DataType.String], this, this.tokens.length));
                this.typeOfHoles[this.tokens.length - 1] = [DataType.Number, DataType.String];

                this.returns = DataType.Any;
            } else {
                this.tokens.push(new TypedEmptyExpr([returns], this, this.tokens.length));
                this.typeOfHoles[this.tokens.length - 1] = [returns];
                this.tokens.push(new NonEditableTkn(" " + operator + " ", this, this.tokens.length));
                this.rightOperandIndex = this.tokens.length;
                this.tokens.push(new TypedEmptyExpr([returns], this, this.tokens.length));
                this.typeOfHoles[this.tokens.length - 1] = [returns];
            }
        } else if (this.operatorCategory === BinaryOperatorCategory.Arithmetic) {
            this.tokens.push(new TypedEmptyExpr([DataType.Number], this, this.tokens.length));
            this.typeOfHoles[this.tokens.length - 1] = [DataType.Number];
            this.tokens.push(new NonEditableTkn(" " + operator + " ", this, this.tokens.length));
            this.rightOperandIndex = this.tokens.length;
            this.tokens.push(new TypedEmptyExpr([DataType.Number], this, this.tokens.length));
            this.typeOfHoles[this.tokens.length - 1] = [DataType.Number];

            this.returns = DataType.Number;
        } else if (this.operatorCategory === BinaryOperatorCategory.Boolean) {
            this.tokens.push(new TypedEmptyExpr([DataType.Boolean], this, this.tokens.length));
            this.typeOfHoles[this.tokens.length - 1] = [DataType.Boolean];
            this.tokens.push(new NonEditableTkn(" " + operator + " ", this, this.tokens.length));
            this.rightOperandIndex = this.tokens.length;
            this.tokens.push(new TypedEmptyExpr([DataType.Boolean], this, this.tokens.length));
            this.typeOfHoles[this.tokens.length - 1] = [DataType.Boolean];

            this.returns = DataType.Boolean;
        } else if (this.operatorCategory == BinaryOperatorCategory.Comparison) {
            this.tokens.push(new TypedEmptyExpr([DataType.Any], this, this.tokens.length));
            this.typeOfHoles[this.tokens.length - 1] = [DataType.Any];
            this.tokens.push(new NonEditableTkn(" " + operator + " ", this, this.tokens.length));
            this.rightOperandIndex = this.tokens.length;
            this.tokens.push(new TypedEmptyExpr([DataType.Any], this, this.tokens.length));
            this.typeOfHoles[this.tokens.length - 1] = [DataType.Any];

            this.returns = DataType.Boolean;
        }

        this.tokens.push(new NonEditableTkn(")", this, this.tokens.length));
        this.hasEmptyToken = true;
    }

    validateContext(validator: Validator, providedContext: Context): boolean {
        return (
            validator.atEmptyExpressionHole(providedContext) ||
            validator.atLeftOfExpression(providedContext) ||
            validator.atRightOfExpression(providedContext)
        );
    }

    replaceLeftOperand(code: Expression) {
        this.onInsertInto(code);
        this.replace(code, this.leftOperandIndex);
    }

    replaceRightOperand(code: Expression) {
        this.onInsertInto(code);
        this.replace(code, this.rightOperandIndex);
    }

    getLeftOperand(): CodeConstruct {
        return this.tokens[this.leftOperandIndex];
    }

    getRightOperand(): CodeConstruct {
        return this.tokens[this.rightOperandIndex];
    }

    isBoolean(): boolean {
        return this.operatorCategory === BinaryOperatorCategory.Boolean;
    }

    isArithmetic(): boolean {
        return this.operatorCategory === BinaryOperatorCategory.Arithmetic;
    }

    isComparison(): boolean {
        return this.operatorCategory === BinaryOperatorCategory.Comparison;
    }

    /**
     * Update
     *
     * @param type new return/operand type
     */
    performTypeUpdatesOnInsertion(type: DataType) {
        if (this.operatorCategory !== BinaryOperatorCategory.Boolean) {
            //in this case the type arrays will always only contain a single type unless it is the + operator
            const leftOperandTypes = (this.tokens[this.leftOperandIndex] as TypedEmptyExpr).type;
            const rightOperandTypes = (this.tokens[this.rightOperandIndex] as TypedEmptyExpr).type;

            if (leftOperandTypes.indexOf(type) == -1) {
                leftOperandTypes.push(type);
            }

            if (rightOperandTypes.indexOf(type) == -1) {
                rightOperandTypes.push(type);
            }

            this.returns = type;
        }
    }

    /**
     * Removes "type" from the type array of the operands of this expression.
     *
     * @param type type to remove
     */
    removeTypeFromOperands(type: DataType) {
        if (!this.isBoolean()) {
            //in this case the type arrays will always only contain a single type unless it is the + operator
            const leftOperandTypes = (this.tokens[this.leftOperandIndex] as TypedEmptyExpr).type;
            const rightOperandTypes = (this.tokens[this.rightOperandIndex] as TypedEmptyExpr).type;

            if (leftOperandTypes.indexOf(type) > -1) {
                leftOperandTypes.splice(leftOperandTypes.indexOf(type), 1);
            }

            if (rightOperandTypes.indexOf(type) > -1) {
                rightOperandTypes.splice(rightOperandTypes.indexOf(type), 1);
            }
        }
    }

    performPreInsertionUpdates(insertInto?: TypedEmptyExpr, insertCode?: Expression) {
        // Special case. + supports String and number and needs to be updated when it is inserted into a hole of one of those types
        if (
            this.operator === BinaryOperator.Add &&
            (insertInto.type.indexOf(DataType.String) > -1 || insertInto.type.indexOf(DataType.Number) > -1)
        ) {
            this.returns = insertInto.type[0]; // it is safe to assume insertInto.type will have a single type because a hole cannot accept both Number and String
            this.performTypeUpdatesOnInsertion(insertInto.type[0]);

            if (insertInto.type.indexOf(DataType.String) > -1) {
                this.removeTypeFromOperands(DataType.Number);
            } else this.removeTypeFromOperands(DataType.String);
        }
    }

    performTypeUpdatesOnInsertInto(insertCode: Expression) {
        if (!this.isBoolean()) {
            //Check if one of the holes is not empty and get its type
            let existingLiteralType = null;
            if (this.tokens[this.leftOperandIndex] instanceof Expression) {
                existingLiteralType = (this.tokens[this.leftOperandIndex] as Expression).returns;
            } else if (this.tokens[this.rightOperandIndex] instanceof Expression) {
                existingLiteralType = (this.tokens[this.rightOperandIndex] as Expression).returns;
            }

            //if existingLiteralType is null then both operands are still empty holes and since we are inserting
            //into one of them, the types need to be updated
            if (!existingLiteralType && (this.returns === DataType.Any || this.returns === DataType.Boolean)) {
                this.returns = insertCode.returns;

                (this.tokens[this.leftOperandIndex] as TypedEmptyExpr).type = [insertCode.returns];
                (this.tokens[this.rightOperandIndex] as TypedEmptyExpr).type = [insertCode.returns];
            }
        }
    }

    //should only be used on nested binary ops
    checkAllHolesAreEmpty() {
        let result = [];

        if (
            (!(this.tokens[this.leftOperandIndex] instanceof TypedEmptyExpr) &&
                !(this.tokens[this.leftOperandIndex] instanceof BinaryOperatorExpr)) ||
            (!(this.tokens[this.rightOperandIndex] instanceof TypedEmptyExpr) &&
                !(this.tokens[this.rightOperandIndex] instanceof BinaryOperatorExpr))
        ) {
            result.push(false);
        }

        for (const tkn of this.tokens) {
            if (tkn instanceof BinaryOperatorExpr) {
                result.push(...tkn.checkAllHolesAreEmpty());
            }
        }

        return result;
    }

    //use this for comparators and arithmetic ops to get their top level expression parent in case they are inside of a nested epxression
    getTopLevelBinExpression(): BinaryOperatorExpr {
        let currParentExpression = this.rootNode instanceof BinaryOperatorExpr ? this.rootNode : this;
        let nextParentExpression = this.rootNode instanceof Module ? null : this.rootNode?.rootNode;
        while (nextParentExpression && nextParentExpression instanceof BinaryOperatorExpr) {
            currParentExpression = nextParentExpression;
            nextParentExpression = nextParentExpression.rootNode;
        }

        return currParentExpression as BinaryOperatorExpr;
    }

    /**
     * Return whether all holes of a nested expression are still empty when used on a nested binary operator expression.
     *
     * @returns true if all holes are TypedEmptyExpr. false otherwise.
     */
    areAllHolesEmpty() {
        const topLevelExpression = this.getTopLevelBinExpression();

        return topLevelExpression.checkAllHolesAreEmpty().every((element) => {
            element;
        });
    }

    onInsertInto(insertCode: Expression) {
        // Inserting a bin op within a bin op needs to update types of holes in the outer levels of the expression
        // This is so that bin ops that operate on different types such as + can have their return and hole types consolidated
        // into one when a more type restricted bin op such as - is inserted inside of them

        //This is also for inserting any other kind of expression within a bin op. It needs to make other holes within it match the isnertion type
        if (this.rootNode instanceof BinaryOperatorExpr && !this.isBoolean() && this.rootNode.areAllHolesEmpty()) {
            if (this.rootNode.operatorCategory === BinaryOperatorCategory.Arithmetic) {
                TypeChecker.setAllHolesToType(this.rootNode.getTopLevelBinExpression(), [insertCode.returns], true);
            } else if (this.rootNode.operatorCategory === BinaryOperatorCategory.Comparison) {
                TypeChecker.setAllHolesToType(this.rootNode.getTopLevelBinExpression(), [insertCode.returns]);
            }
        } else {
            // In the case that the root is a binOp and its holes are not empty, need to update the holes of this expr to that type as well
        }

        this.performTypeUpdatesOnInsertInto(insertCode);
    }

    typeValidateInsertionIntoHole(
        insertCode: Expression,
        enableWarnings: boolean,
        insertInto?: TypedEmptyExpr,
        notifSystem?: NotificationSystemController
    ): boolean {
        let isValidType = false;

        if (this.operatorCategory === BinaryOperatorCategory.Boolean) {
            isValidType = insertCode.returns != DataType.Boolean;
        } else {
            isValidType = super.typeValidateInsertionIntoHole(insertCode, enableWarnings, insertInto, notifSystem);
        }

        if (enableWarnings && !isValidType) {
            switch (this.operatorCategory) {
                case BinaryOperatorCategory.Arithmetic:
                    notifSystem.addBinOpOperandTypeMismatchWarning(insertInto, insertInto, insertCode);
                    break;
                case BinaryOperatorCategory.Boolean:
                    notifSystem.addBinBoolOpOperandInsertionTypeMismatchWarning(insertInto, insertInto, insertCode);
                    break;
                case BinaryOperatorCategory.Comparison:
                    notifSystem.addCompOpOperandTypeMismatchWarning(insertInto, insertInto, insertCode);
                    break;
                default:
                    notifSystem.addBinOpOperandTypeMismatchWarning(insertInto, insertInto, insertCode);
                    break;
            }
        }

        return isValidType;
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

    validateContext(validator: Validator, providedContext: Context): boolean {
        return validator.atEmptyExpressionHole(providedContext) || validator.atLeftOfExpression(providedContext);
    }

    replaceOperand(code: CodeConstruct) {
        this.replace(code, this.operandIndex);
    }

    getKeyword(): string {
        return this.operator;
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
    allowedBoolOps = new Array<BinaryOperator>();

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

                this.allowedBoolOps.push(BinaryOperator.And);
                this.allowedBoolOps.push(BinaryOperator.Or);

                break;
            }
        }

        this.rootNode = root;
        this.indexInRoot = indexInRoot;
    }

    validateContext(validator: Validator, providedContext: Context): boolean {
        return validator.atEmptyExpressionHole(providedContext);
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
        super(DataType.AnyList);

        this.rootNode = root;
        this.indexInRoot = indexInRoot;

        this.tokens.push(new NonEditableTkn("[", this, this.tokens.length));
        this.tokens.push(new TypedEmptyExpr([DataType.Any], this, this.tokens.length));
        this.typeOfHoles[this.tokens.length - 1] = [DataType.Any];
        this.tokens.push(new NonEditableTkn("]", this, this.tokens.length));

        this.hasEmptyToken = true;
    }

    validateContext(validator: Validator, providedContext: Context): boolean {
        return validator.atEmptyExpressionHole(providedContext) || validator.atLeftOfExpression(providedContext);
    }

    performTypeUpdatesOnInsertInto(insertCode: Expression) {
        let dataType;
        if (this.areAllHolesEmpty()) {
            dataType = TypeChecker.getListTypeFromElementType(insertCode.returns);
        } else if (TypeChecker.getElementTypeFromListType(this.returns) !== insertCode.returns) {
            dataType = DataType.AnyList;
        }

        this.returns = dataType;
        this.updateVariableType(dataType);
    }

    //return whether all elements of this list are of type TypedEmptyExpr
    areAllHolesEmpty() {
        const elements = this.tokens.filter((tkn) => !(tkn instanceof NonEditableTkn));
        const numberOfElements = elements.length;
        const numberOfEmptyHoles = elements.filter((element) => element instanceof TypedEmptyExpr).length;

        return numberOfEmptyHoles === numberOfElements;
    }

    onInsertInto(insertCode: Expression) {
        this.performTypeUpdatesOnInsertInto(insertCode);
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

    getSelection(): monaco.Selection {
        return this.rootNode.getSelection();
    }
}
