import { Position, Selection } from "monaco-editor";
import { EditCodeAction, InsertionResult } from "../editor/action-filter";
import { ConstructName } from "../editor/consts";
import { DraftRecord } from "../editor/draft";
import { Context, UpdatableContext } from "../editor/focus";
import { updateButtonsVisualMode } from "../editor/toolbox";
import { Validator } from "../editor/validator";
import { CodeBackground, HoverNotification, Notification } from "../notification-system/notification";
import { areEqualTypes, hasMatch, Util } from "../utilities/util";
import { Callback, CallbackType } from "./callback";
import {
    arithmeticOps,
    AugmentedAssignmentOperator,
    AutoCompleteType,
    BinaryOperator,
    BinaryOperatorCategory,
    boolOps,
    comparisonOps,
    DataType,
    IndexableTypes,
    InsertionType,
    ListTypes,
    NumberRegex,
    StringRegex,
    TAB_SPACES,
    typeToConversionRecord,
    TYPE_MISMATCH_EXPR_DRAFT_MODE_STR,
    TYPE_MISMATCH_IN_HOLE_DRAFT_MODE_STR,
    UnaryOp,
} from "./consts";
import { Module } from "./module";
import { Scope } from "./scope";
import { TypeChecker } from "./type-checker";
import { VariableController } from "./variable-controller";

export interface CodeConstruct {
    /**
     * The parent/root node for this code-construct. Statements are the only code construct that could have the Module as their root node.
     */
    rootNode: CodeConstruct | Module;

    /**
     * The index this item has inside its root's body (if root is the Module), or its tokens array.
     */
    indexInRoot: number;

    /**
     * The left column position of this code-construct.
     */
    left: number;

    /**
     * The right column position of this code-construct.
     */
    right: number;

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

    callbacksToBeDeleted: Map<CallbackType, string>;

    /**
     * Builds the left and right positions of this node and all of its children nodes recursively.
     * @param pos the left position to start building the nodes from
     * @returns the final right position of the whole node (calculated after building all of the children nodes)
     */
    build(pos: Position): Position;

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
    getLeftPosition(): Position;

    /**
     * Returns the right-position `(lineNumber, column)` of this code-construct in the rendered text.
     */
    getRightPosition(): Position;

    /**
     * Returns a `Selection` object for this particular code-construct when it is selected
     */
    getSelection(): Selection;

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
     *
     * NOTE: The reason why you have to call it on the future parent of insertCode instead of insertCode itself is because before insertCode is inserted into the AST
     * we cannot access the parent's holes through insertCode.rootNode and get their types that way.
     *
     * NOTE: The reason why insertInto is a parameter is because some constructs have multiple holes and we need to know the one we are inserting into.
     *
     * @param insertCode     code being inserted
     * @param insertInto     hole being inserted into
     *
     * @returns True if insertCode's type is accepted by insertInto according to what the parent of insertInto is. Returns False otherwise.
     */
    typeValidateInsertionIntoHole(insertCode: Expression, insertInto?: TypedEmptyExpr): InsertionResult;

    /**
     * Actions that need to run after the construct has been validated for insertion, but before it is inserted into the AST.
     *
     * @param insertInto code to insert into
     * @param insertCode code being inserted
     */
    performPreInsertionUpdates(insertInto?: TypedEmptyExpr, insertCode?: Expression): void;

    onFocusOff(arg: any): void;

    performPostInsertionUpdates(insertInto?: TypedEmptyExpr, insertCode?: Expression): void;

    markCallbackForDeletion(callbackType: CallbackType, callbackId: string): void;
}

/**
 * A complete code statement such as: variable assignment, function call, conditional, loop, function definition, and other statements.
 */
export abstract class Statement implements CodeConstruct {
    lineNumber: number;
    left: number;
    right: number;
    rootNode: Statement | Module = null;
    indexInRoot: number;
    body = new Array<Statement>();
    scope: Scope = null;
    tokens = new Array<CodeConstruct>();
    hasEmptyToken: boolean;
    callbacks = new Map<string, Array<Callback>>();
    background: CodeBackground = null;
    notification: HoverNotification = null;
    keywordIndex = -1;
    hole = null;
    typeOfHoles = new Map<number, Array<DataType>>();
    draftModeEnabled = false;
    draftRecord: DraftRecord = null;
    codeConstructName = ConstructName.Default;
    callbacksToBeDeleted = new Map<CallbackType, string>();

    constructor() {
        for (const type in CallbackType) this.callbacks[type] = new Array<Callback>();
    }

    checkInsertionAtHole(index: number, givenType: DataType): InsertionResult {
        if (Object.keys(this.typeOfHoles).length > 0) {
            const holeType = this.typeOfHoles[index];

            let canConvertToParentType = hasMatch(Util.getInstance().typeConversionMap.get(givenType), holeType);

            if (canConvertToParentType && !hasMatch(holeType, [givenType])) {
                const conversionRecords = typeToConversionRecord.has(givenType)
                    ? typeToConversionRecord.get(givenType).filter((record) => holeType.indexOf(record.convertTo) > -1)
                    : [];

                return new InsertionResult(InsertionType.DraftMode, "", conversionRecords); //NOTE: message is populated by calling code as it has enough context info
            } else if (holeType.some((t) => t == DataType.Any) || hasMatch(holeType, [givenType])) {
                return new InsertionResult(InsertionType.Valid, "", []);
            }
        }

        return new InsertionResult(InsertionType.Invalid, "", []);
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

        this.notify(CallbackType.change);

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
        for (const callback of this.callbacks[type]) callback.callback(this);

        if (this.callbacksToBeDeleted.size > 0) {
            for (const entry of this.callbacksToBeDeleted) {
                this.unsubscribe(entry[0], entry[1]);
            }

            this.callbacksToBeDeleted.clear();
        }
    }

    init(pos: Position) {
        this.build(pos);

        if (this.hasBody())
            for (let i = 0; i < this.body.length; i++)
                this.body[i].build(new Position(pos.lineNumber + i + 1, pos.column + TAB_SPACES));
    }

    build(pos: Position): Position {
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
    rebuild(pos: Position, fromIndex: number) {
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

        return { positionToMove: new Position(this.getLineNumber(), this.right) };
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

        if (rebuildColumn) this.rebuild(new Position(this.lineNumber, rebuildColumn), index);

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

    /**
     * Returns the textual value of the statement's particular line
     */
    getLineText(): string {
        let txt: string = "";

        for (const token of this.tokens) txt += token.getRenderText();

        return txt;
    }

    getLineNumber(): number {
        return this.lineNumber;
    }

    getLeftPosition(): Position {
        return new Position(this.getLineNumber(), this.left);
    }

    getRightPosition(): Position {
        return new Position(this.getLineNumber(), this.right);
    }

    getSelection(): Selection {
        return new Selection(this.lineNumber, this.right, this.lineNumber, this.left);
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

    typeValidateInsertionIntoHole(insertCode: Expression, insertInto?: TypedEmptyExpr): InsertionResult {
        if (insertInto?.type?.indexOf(insertCode.returns) > -1 || insertInto?.type?.indexOf(DataType.Any) > -1) {
            return new InsertionResult(InsertionType.Valid, "", []);
        } //types match or one of them is Any

        //need to check if the type being inserted can be converted into any of the types that the hole accepts
        return insertInto?.canReplaceWithConstruct(insertCode);
    }

    performPostInsertionUpdates(insertInto?: TypedEmptyExpr, insertCode?: Expression) {}

    performPreInsertionUpdates(insertInto?: TypedEmptyExpr, insertCode?: Expression) {}

    /**
     * Actions performed when a code construct is inserted within a hole of this code construct.
     *
     * @param insertCode code being inserted
     */
    onInsertInto(insertCode: CodeConstruct) {}

    abstract validateContext(validator: Validator, providedContext: Context): InsertionType;

    //actions that need to occur when the focus is switched off of this statement
    onFocusOff(arg: any): void {
        return;
    }

    markCallbackForDeletion(callbackType: CallbackType, callbackId: string): void {
        this.callbacksToBeDeleted.set(callbackType, callbackId);
    }
}

/**
 * A statement that returns a value such as: binary operators, unary operators, function calls that return a value, literal values, and variables.
 */
export abstract class Expression extends Statement implements CodeConstruct {
    rootNode: Expression | Statement = null;

    // TODO: can change this to an Array to enable type checking when returning multiple items
    returns: DataType;

    constructor(returns: DataType) {
        super();

        this.returns = returns;
    }

    getLineNumber(): number {
        return this.rootNode.getLineNumber();
    }

    getSelection(): Selection {
        const line = this.lineNumber >= 0 ? this.lineNumber : this.getLineNumber();

        return new Selection(line, this.right, line, this.left);
    }

    getParentStatement(): Statement {
        return this.rootNode.getParentStatement();
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
    canReplaceWithConstruct(replaceWith: Expression): InsertionResult {
        //when we are replacing at the top level (meaning the item above is a Statement),
        //we need to check types against the type of hole that used to be there and not the expression
        //that is currently there

        //Might need the same fix for MemberCallStmt in the future, but it does not work right now so cannot check

        if (this.rootNode instanceof Expression && !this.draftModeEnabled) {
            //when replacing within expression we need to check if the replacement can be cast into or already has the same type as the one being replaced
            if (replaceWith.returns === this.returns || this.returns === DataType.Any) {
                return new InsertionResult(InsertionType.Valid, "", []);
            } else if (
                replaceWith.returns !== this.returns &&
                hasMatch(Util.getInstance().typeConversionMap.get(replaceWith.returns), [this.returns])
            ) {
                const conversionRecords = typeToConversionRecord.has(replaceWith.returns)
                    ? typeToConversionRecord
                          .get(replaceWith.returns)
                          .filter((record) => record.convertTo == this.returns)
                    : [];

                return new InsertionResult(
                    InsertionType.DraftMode,
                    TYPE_MISMATCH_EXPR_DRAFT_MODE_STR(this.getKeyword(), [this.returns], replaceWith.returns),
                    conversionRecords
                );
            } else {
                return new InsertionResult(InsertionType.Invalid, "", []);
            }
        } else if (!(this.rootNode instanceof Module)) {
            const rootTypeOfHoles = (this.rootNode as Statement).typeOfHoles;

            if (Object.keys(rootTypeOfHoles).length > 0) {
                const typesOfParentHole = rootTypeOfHoles[this.indexInRoot];

                let canConvertToParentType = hasMatch(
                    Util.getInstance().typeConversionMap.get(replaceWith.returns),
                    typesOfParentHole
                );

                if (canConvertToParentType && !hasMatch(typesOfParentHole, [replaceWith.returns])) {
                    const conversionRecords = typeToConversionRecord.has(replaceWith.returns)
                        ? typeToConversionRecord
                              .get(replaceWith.returns)
                              .filter((record) => typesOfParentHole.indexOf(record.convertTo) > -1)
                        : [];

                    return new InsertionResult(
                        InsertionType.DraftMode,
                        TYPE_MISMATCH_EXPR_DRAFT_MODE_STR(
                            this.rootNode.getKeyword(),
                            typesOfParentHole,
                            replaceWith.returns
                        ),
                        conversionRecords
                    );
                } else if (
                    typesOfParentHole?.some((t) => t == DataType.Any) ||
                    hasMatch(typesOfParentHole, [replaceWith.returns])
                ) {
                    return new InsertionResult(InsertionType.Valid, "", []);
                }
            }

            return new InsertionResult(InsertionType.Invalid, "", []);
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

export abstract class Modifier extends Expression {
    rootNode: ValueOperationExpr | VarOperationStmt;
    leftExprTypes: Array<DataType>;

    constructor() {
        super(null);
    }

    getModifierText(): string {
        return "";
    }

    abstract constructFullOperation(varRef: VariableReferenceExpr): Statement | Expression;
}

/**
 * The smallest code construct: identifiers, holes (for either identifiers or expressions), operators and characters, and etc.
 */
export abstract class Token implements CodeConstruct {
    isTextEditable = false;
    rootNode: CodeConstruct = null;
    indexInRoot: number;
    left: number;
    right: number;
    text: string;
    isEmpty: boolean = false;
    callbacks = new Map<string, Array<Callback>>();
    notification = null;
    draftModeEnabled = false;
    draftRecord = null;
    codeConstructName = ConstructName.Default;
    callbacksToBeDeleted = new Map<CallbackType, string>();

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
        for (const callback of this.callbacks[type]) callback.callback(this);

        if (this.callbacksToBeDeleted.size > 0) {
            for (const entry of this.callbacksToBeDeleted) {
                this.unsubscribe(entry[0], entry[1]);
            }

            this.callbacksToBeDeleted.clear();
        }
    }

    /**
     * Builds the left and right positions of this token based on its text length.
     * @param pos the left position to start building this node's right position.
     * @returns the final right position of this node: for tokens it equals to `this.left + this.text.length - 1`
     */
    build(pos: Position): Position {
        this.left = pos.column;

        if (this.text.length == 0) {
            console.warn(
                "do not use any Tokens with no textual length (i.e. all tokens should take some space in the editor)."
            );
            this.right = pos.column;
        } else this.right = pos.column + this.text.length;

        this.notify(CallbackType.change);

        if (this.text.length == 0) return new Position(pos.lineNumber, this.right);
        else return new Position(pos.lineNumber, this.right);
    }

    /**
     * Finds and returns the next empty hole (name or value) in this code construct
     * @returns The found empty token or null (if nothing it didn't include any empty tokens)
     */
    getInitialFocus(): UpdatableContext {
        if (this.isEmpty) return { tokenToSelect: this };

        return { positionToMove: new Position(this.getLineNumber(), this.right) };
    }

    getRenderText(): string {
        return this.text;
    }

    getLineNumber(): number {
        if (this.rootNode instanceof Statement) return this.rootNode.getLineNumber();
        else return (this.rootNode as Expression).getLineNumber();
    }

    getLeftPosition(): Position {
        return new Position(this.getLineNumber(), this.left);
    }

    getRightPosition(): Position {
        return new Position(this.getLineNumber(), this.right);
    }

    getSelection(): Selection {
        const line = this.getLineNumber();

        return new Selection(line, this.right, line, this.left);
    }

    getParentStatement(): Statement {
        return this.rootNode.getParentStatement();
    }

    performPreInsertionUpdates(insertInto?: TypedEmptyExpr, insertCode?: Expression) {}

    onFocusOff(arg: any): void {
        return;
    }

    performPostInsertionUpdates(insertInto?: TypedEmptyExpr, insertCode?: Expression) {}

    typeValidateInsertionIntoHole(insertCode: Expression, insertInto: TypedEmptyExpr): InsertionResult {
        return new InsertionResult(InsertionType.Valid, "", []);
    }

    markCallbackForDeletion(callbackType: CallbackType, callbackId: string): void {
        this.callbacksToBeDeleted.set(callbackType, callbackId);
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

export class WhileStatement extends Statement {
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

    validateContext(validator: Validator, providedContext: Context): InsertionType {
        return validator.onEmptyLine(providedContext) ? InsertionType.Valid : InsertionType.Invalid;
    }
}

export class IfStatement extends Statement {
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

    validateContext(validator: Validator, providedContext: Context): InsertionType {
        return validator.onEmptyLine(providedContext) ? InsertionType.Valid : InsertionType.Invalid;
    }
}

export class ElseStatement extends Statement {
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

    validateContext(validator: Validator, providedContext: Context): InsertionType {
        return validator.onEmptyLine(providedContext) &&
            (this.hasCondition
                ? validator.canInsertElifStmtAtCurIndent(providedContext) ||
                  validator.canInsertElifStmtAtPrevIndent(providedContext)
                : validator.canInsertElseStmtAtCurIndent(providedContext) ||
                  validator.canInsertElseStmtAtPrevIndent(providedContext))
            ? InsertionType.Valid
            : InsertionType.Invalid;
    }
}

export class ImportStatement extends Statement {
    private moduleNameIndex: number = -1;
    private itemNameIndex: number = -1;
    constructor(moduleName: string = "", itemName: string = "") {
        super();

        this.tokens.push(new NonEditableTkn("from ", this, this.tokens.length));
        this.moduleNameIndex = this.tokens.length;
        this.tokens.push(new EditableTextTkn(moduleName, new RegExp("^[a-zA-Z]*$"), this, this.tokens.length));
        this.tokens.push(new NonEditableTkn(" import ", this, this.tokens.length));
        this.itemNameIndex = this.tokens.length;
        this.tokens.push(new EditableTextTkn(itemName, new RegExp("^[a-zA-Z]*$"), this, this.tokens.length));

        this.subscribe(
            CallbackType.onFocusOff,
            new Callback(() => {
                this.onFocusOff({ module: this.getModule() });
            })
        );

        this.subscribe(
            CallbackType.delete,
            new Callback(() => {
                this.onDelete(this.getModule()); //TODO: I don't like this either, but we need the module there
            })
        );
    }

    validateContext(validator: Validator, providedContext: Context): InsertionType {
        //TODO: This is the same for most Statements so should probably move this functionality into the parent class
        return validator.onEmptyLine(providedContext) ? InsertionType.Valid : InsertionType.Invalid;
    }

    getImportModuleName(): string {
        return this.tokens[this.moduleNameIndex].getRenderText();
    }
    getImportItemName(): string {
        return this.tokens[this.itemNameIndex].getRenderText();
    }

    onFocusOff(args: any): void {
        if (this.getImportModuleName() !== "" && this.getImportItemName() !== "") {
            //TODO: Not efficient, but the only way to improve this is to constantly maintain an updated "imported" status
            //on the construct requiring an import, which is tedious so I left it for now. If this ever becomes an issue, that is the solution.
            args.module.validator.validateImports();
        }
    }

    setImportModule(txt: string) {
        (this.tokens[this.moduleNameIndex] as EditableTextTkn).setEditedText(txt);
    }

    setImportItem(txt: string) {
        (this.tokens[this.itemNameIndex] as EditableTextTkn).setEditedText(txt);
    }

    private onDelete(module: Module) {
        let stmts = module.getAllImportStmts();
        stmts = stmts.filter((stmt) => stmt !== this);
        module.validator.validateImports(stmts);
    }
}

export class ForStatement extends Statement implements VariableContainer {
    buttonId: string;
    private identifierIndex: number;
    private iteratorIndex: number;

    loopVar: VarAssignmentStmt = null;

    //TODO: Statements should not have a data type?
    dataType = DataType.Any;

    constructor(root?: CodeConstruct | Module, indexInRoot?: number) {
        super();

        this.buttonId = "";

        this.tokens.push(new NonEditableTkn("for ", this, this.tokens.length));
        this.identifierIndex = this.tokens.length;
        this.tokens.push(new IdentifierTkn(undefined, this, this.tokens.length));
        this.tokens.push(new NonEditableTkn(" in ", this, this.tokens.length));
        this.iteratorIndex = this.tokens.length;
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

    setIterator(iterator: Expression) {
        this.tokens[this.iteratorIndex] = iterator;
        this.onInsertInto(iterator);
    }

    validateContext(validator: Validator, providedContext: Context): InsertionType {
        return validator.onEmptyLine(providedContext) ? InsertionType.Valid : InsertionType.Invalid;
    }

    rebuild(pos: Position, fromIndex: number) {
        super.rebuild(pos, fromIndex);
    }

    getIdentifier(): string {
        return this.tokens[this.identifierIndex].getRenderText();
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

            if (this.buttonId === "") {
                //when we are changing a new var assignment statement
                this.assignVariable(varController, currentIdentifierAssignments);
            } else {
                //when we are changing an existing var assignment statement
                this.reassignVar(this.buttonId, varController, currentIdentifierAssignments, oldIdentifierAssignments);
            }

            varController.updateVarButtonWithType(
                this.loopVar.buttonId,
                this.scope,
                this.lineNumber,
                this.getIdentifier()
            );
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
        this.loopVar.updateIdentifier(this.getIdentifier(), this.getIdentifier(), false);
        varController.addVariableRefButton(this.loopVar);
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
        this.loopVar.buttonId = statement.buttonId;

        this.loopVar.updateIdentifier(this.getIdentifier(), this.getIdentifier());
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
        if (insertCode instanceof ListLiteralExpression || ListTypes.indexOf(insertCode.returns) > -1) {
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

export class EmptyLineStmt extends Statement {
    hasEmptyToken = false;

    constructor(root?: Statement | Module, indexInRoot?: number) {
        super();

        this.rootNode = root;
        this.indexInRoot = indexInRoot;
    }

    validateContext(validator: Validator, providedContext: Context): InsertionType {
        return validator.canInsertEmptyLine(providedContext) ? InsertionType.Valid : InsertionType.Invalid;
    }

    build(pos: Position): Position {
        this.lineNumber = pos.lineNumber;
        this.left = this.right = pos.column;

        return new Position(this.lineNumber, this.right);
    }

    getInitialFocus(): UpdatableContext {
        return { positionToMove: this.getLeftPosition() };
    }

    getRenderText(): string {
        return "";
    }

    toString(): string {
        return "EmptyLine";
    }
}

export class VarAssignmentStmt extends Statement implements VariableContainer {
    static uniqueId: number = 0;
    buttonId: string = ""; //note: this is used as both the DOM id of the reference button in the toolbox AND the unique id of the variable itself
    private identifierIndex: number;
    private valueIndex: number;
    dataType = DataType.Any;
    codeConstructName = ConstructName.VarAssignment;
    private oldIdentifier: string;

    constructor(buttonId?: string, id?: string, root?: Statement | Module, indexInRoot?: number) {
        super();

        this.rootNode = root;
        this.indexInRoot = indexInRoot;

        this.identifierIndex = this.tokens.length;
        this.tokens.push(new IdentifierTkn(id, this, this.tokens.length));

        if (id) {
            this.buttonId = buttonId;
            this.updateIdentifier(id, id); //TODO: This is a crude hack. Should get the name from the scope or something else that is connected to the AST.
        } else {
            this.oldIdentifier = this.getIdentifier();
        }

        this.tokens.push(new NonEditableTkn(" = ", this, this.tokens.length));
        this.valueIndex = this.tokens.length;
        this.tokens.push(new TypedEmptyExpr([DataType.Any], this, this.tokens.length));
        this.typeOfHoles[this.tokens.length - 1] = [DataType.Any];

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

    validateContext(validator: Validator, providedContext: Context): InsertionType {
        return validator.onEmptyLine(providedContext) ? InsertionType.Valid : InsertionType.Invalid;
    }

    rebuild(pos: Position, fromIndex: number) {
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

    updateIdentifier(identifier: string, oldIdentifier?: string, updateButton: boolean = true) {
        this.oldIdentifier = oldIdentifier ?? this.getIdentifier();

        (this.tokens[this.identifierIndex] as IdentifierTkn).setIdentifierText(identifier);

        if (this.buttonId && this.buttonId !== "" && updateButton) {
            this.updateButton();
        }
    }

    setIdentifier(identifier: string) {
        // this is only for user-defined variables (coming from the action-filter)
        (this.tokens[this.identifierIndex] as IdentifierTkn).setIdentifierText(identifier);
    }

    onFocusOff(): void {
        const currentIdentifier = this.getIdentifier();
        const varController = this.getModule().variableController;

        if (currentIdentifier !== this.oldIdentifier || this.buttonId === "") {
            if (currentIdentifier === "  ") {
                this.removeAssignment();

                if (
                    (this.rootNode as Module | Statement).scope.references.filter(
                        (ref) => (ref.statement as VarAssignmentStmt).getIdentifier() === this.oldIdentifier
                    ).length === 0 &&
                    varController.getAllAssignmentsToVar(this.buttonId, this.getModule()).length === 0
                ) {
                    varController.removeVariableRefButton(this.buttonId);
                    varController.addWarningToVarRefs(this.buttonId, this.getModule());
                }

                this.buttonId = "";
                this.oldIdentifier = "  ";
            } else {
                const currentIdentifierAssignments = (
                    this.rootNode as Statement | Module
                ).scope.getAllVarAssignmentsToNewVar(currentIdentifier, this.getModule(), this.lineNumber, this);

                const oldIdentifierAssignments = (
                    this.rootNode as Statement | Module
                ).scope.getAllVarAssignmentsToNewVar(this.oldIdentifier, this.getModule(), this.lineNumber, this);

                if (this.buttonId === "") {
                    //when we are changing a new var assignment statement
                    this.assignVariable(varController, currentIdentifierAssignments);
                } else {
                    //when we are changing an existing var assignment statement
                    this.reassignVar(
                        this.buttonId,
                        varController,
                        currentIdentifierAssignments,
                        oldIdentifierAssignments
                    );
                }

                this.oldIdentifier = currentIdentifier;

                //There are two types of callbacks in focus.ts OnNavChangeCallbacks and OnNavOffCallbacks. They also run in this order.
                //The variable is created by the latter and the former runs validation checks. When a variable is first created we therefore
                //have to manually run variable-related validations here.
                varController.updateVarButtonWithType(
                    this.buttonId,
                    (this.rootNode as Module | Statement).scope,
                    this.lineNumber,
                    this.getIdentifier()
                );
                const insertions = this.getModule().actionFilter.getProcessedVariableInsertions();
                updateButtonsVisualMode(insertions);
            }
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
        }

        this.getModule().processNewVariable(
            this,
            this.rootNode instanceof Module || this.rootNode instanceof Statement ? this.rootNode.scope : null
        );
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
        this.dataType = insertCode.returns; //#344
    }

    removeAssignment() {
        (this.rootNode as Module | Statement).scope.references.splice(
            (this.rootNode as Module | Statement).scope.references.map((ref) => ref.statement).indexOf(this),
            1
        );
    }

    private onDelete() {
        const varController = this.getModule().variableController;

        if (this.buttonId !== "") {
            (this.rootNode as Module | Statement).scope.references = (
                this.rootNode as Module | Statement
            ).scope.references.filter((ref) => ref.statement !== this);

            //deleting a variable by deleting its identifier first and then immediately deleting the statement without focusing off it
            const assignments = (this.rootNode as Statement | Module).scope.getAllAssignmentsToVariableWithinScope(
                this.oldIdentifier,
                this
            );

            if (assignments.length === 0) {
                varController.removeVariableRefButton(this.buttonId);
                varController.addWarningToVarRefs(this.buttonId, this.getModule());
            }
        }
    }
}

export class VariableReferenceExpr extends Expression {
    isEmpty = false;
    identifier: string;
    uniqueId: string;

    constructor(id: string, returns: DataType, uniqueId: string, root?: Statement, indexInRoot?: number) {
        super(returns);

        const idToken = new NonEditableTkn(id);
        idToken.rootNode = this;
        idToken.indexInRoot = this.tokens.length;
        this.keywordIndex = this.tokens.length;
        this.tokens.push(idToken);

        this.uniqueId = uniqueId;
        this.identifier = id;
        this.rootNode = root;
        this.indexInRoot = indexInRoot;
    }

    validateContext(validator: Validator, providedContext: Context): InsertionType {
        if (validator.atEmptyExpressionHole(providedContext)) return InsertionType.Valid;
        else if (validator.onEmptyLine(providedContext)) return InsertionType.DraftMode;
        else return InsertionType.Invalid;
    }

    getKeyword(): string {
        return this.tokens[this.keywordIndex].getRenderText();
    }
}

export class ValueOperationExpr extends Expression {
    isVarSet = false;

    constructor(value: Expression, modifiers?: Array<Modifier>, root?: Statement, indexInRoot?: number) {
        super(value != null ? value.returns : DataType.Void);

        if (value != null) {
            value.indexInRoot = this.tokens.length;
            value.rootNode = this;

            this.isVarSet = true;
        }

        this.tokens.push(value);

        this.rootNode = root;
        this.indexInRoot = indexInRoot;

        if (modifiers) for (const mod of modifiers) this.appendModifier(mod);
    }

    setVariable(ref: VariableReferenceExpr) {
        ref.indexInRoot = this.tokens.length;
        ref.rootNode = this;
        this.tokens[0] = ref;
        this.isVarSet = true;
    }

    updateReturnType() {
        for (const mod of this.tokens) {
            if (mod instanceof ListAccessModifier) this.returns = TypeChecker.getElementTypeFromListType(this.returns);
            else if (mod instanceof Expression) this.returns = mod.returns;
        }
    }

    appendModifier(mod: Modifier) {
        mod.indexInRoot = this.tokens.length;
        mod.rootNode = this;

        this.tokens.push(mod);

        // always take the last modifier's return value for the whole expression:
        this.returns = mod.returns;
    }

    validateContext(validator: Validator, providedContext: Context): InsertionType {
        return validator.atEmptyExpressionHole(providedContext) ? InsertionType.Valid : InsertionType.Invalid;
    }

    getKeyword(): string {
        return (this.tokens[this.tokens.length - 1] as Modifier).getModifierText();
    }

    getVarRef(): VariableReferenceExpr {
        return this.tokens[0] as VariableReferenceExpr;
    }
}

export class VarOperationStmt extends Statement {
    isVarSet = false;

    constructor(ref: VariableReferenceExpr, modifiers?: Array<Modifier>, root?: Statement, indexInRoot?: number) {
        super();

        if (ref != null) {
            ref.indexInRoot = this.tokens.length;
            ref.rootNode = this;
            this.isVarSet = true;
        }

        this.tokens.push(ref);

        this.rootNode = root;
        this.indexInRoot = indexInRoot;

        if (modifiers)
            for (const mod of modifiers) {
                mod.indexInRoot = this.tokens.length;
                mod.rootNode = this;

                this.tokens.push(mod);
            }
    }

    setVariable(ref: VariableReferenceExpr) {
        ref.indexInRoot = this.tokens.length;
        ref.rootNode = this;
        this.tokens[0] = ref;
        this.isVarSet = true;
    }

    updateModifierTypes() {
        for (let i = 1; i < this.tokens.length; i++) {
            const mod = this.tokens[i];

            if (mod instanceof AugmentedAssignmentModifier) {
                const rightMostReturnsType = (this.tokens[i - 1] as Expression).returns;
                (mod.tokens[1] as TypedEmptyExpr).type = [rightMostReturnsType];
                mod.typeOfHoles[1] = [rightMostReturnsType];
            }
        }
    }

    appendModifier(mod: Modifier) {
        if (mod instanceof AugmentedAssignmentModifier) {
            const rightMostReturnsType = (this.tokens[this.tokens.length - 1] as Expression).returns;
            (mod.tokens[1] as TypedEmptyExpr).type = [rightMostReturnsType];
            mod.typeOfHoles[1] = [rightMostReturnsType];
        }

        mod.indexInRoot = this.tokens.length;
        mod.rootNode = this;

        this.tokens.push(mod);
    }

    validateContext(validator: Validator, providedContext: Context): InsertionType {
        return validator.onBeginningOfLine(providedContext) ? InsertionType.Valid : InsertionType.Invalid;
    }

    getVarRef(): VariableReferenceExpr {
        return this.tokens[0] as VariableReferenceExpr;
    }
}

export class ListAccessModifier extends Modifier {
    leftExprTypes = [DataType.AnyList];

    constructor(root?: ValueOperationExpr | VarOperationStmt, indexInRoot?: number) {
        super();

        this.rootNode = root;
        this.indexInRoot = indexInRoot;

        this.tokens.push(new NonEditableTkn(`[`, this, this.tokens.length));
        this.tokens.push(new TypedEmptyExpr([DataType.Number], this, this.tokens.length));
        this.typeOfHoles[this.tokens.length - 1] = [DataType.Number];
        this.tokens.push(new NonEditableTkn(`]`, this, this.tokens.length));
    }

    validateContext(validator: Validator, providedContext: Context): InsertionType {
        return IndexableTypes.indexOf(providedContext?.expressionToLeft?.returns) > -1
            ? InsertionType.Valid
            : InsertionType.Invalid;
    }

    getModifierText(): string {
        return "[---]";
    }

    constructFullOperation(varRef: VariableReferenceExpr): Statement {
        return new VarOperationStmt(varRef, [this]);
    }
}

export class PropertyAccessorModifier extends Modifier {
    private propertyName: string;

    constructor(
        propertyName: string,
        exprType: DataType,
        root?: ValueOperationExpr | VarOperationStmt,
        indexInRoot?: number
    ) {
        super();

        this.leftExprTypes = [exprType];
        this.rootNode = root;
        this.indexInRoot = indexInRoot;

        this.tokens.push(new NonEditableTkn(`.${propertyName}`, this, this.tokens.length));

        this.propertyName = propertyName;
    }

    validateContext(validator: Validator, providedContext: Context): InsertionType {
        return InsertionType.Valid;
    }

    getModifierText(): string {
        return `.${this.propertyName}`;
    }

    constructFullOperation(varRef: VariableReferenceExpr): Expression {
        return new ValueOperationExpr(varRef, [this]);
    }
}

export class MethodCallModifier extends Modifier {
    functionName: string = "";
    args: Array<Argument>;
    returns: DataType;

    constructor(
        functionName: string,
        args: Array<Argument>,
        returns: DataType,
        exprType: DataType,
        root?: ValueOperationExpr | VarOperationStmt,
        indexInRoot?: number
    ) {
        super();

        this.rootNode = root;
        this.indexInRoot = indexInRoot;

        this.functionName = functionName;
        this.args = args;
        this.returns = returns;
        this.leftExprTypes = [exprType];

        if (args.length > 0) {
            this.tokens.push(new NonEditableTkn("." + functionName + "(", this, this.tokens.length));

            for (let i = 0; i < args.length; i++) {
                let arg = args[i];

                this.tokens.push(new TypedEmptyExpr([...arg.type], this, this.tokens.length));
                this.typeOfHoles[this.tokens.length - 1] = [...arg.type];

                if (i + 1 < args.length) this.tokens.push(new NonEditableTkn(", ", this, this.tokens.length));
            }

            this.tokens.push(new NonEditableTkn(")", this, this.tokens.length));

            this.hasEmptyToken = true;
        } else this.tokens.push(new NonEditableTkn(functionName + "()", this, this.tokens.length));
    }

    validateContext(validator: Validator, providedContext: Context): InsertionType {
        let doTypesMatch = this.leftExprTypes.some((type) =>
            areEqualTypes(providedContext?.expressionToLeft?.returns, type)
        );

        //#260/#341
        if (
            this.returns === DataType.Void &&
            providedContext?.lineStatement instanceof VarOperationStmt &&
            ListTypes.indexOf(providedContext?.lineStatement.getVarRef().returns) > -1
        ) {
            doTypesMatch = true;
        } else if (this.returns === DataType.Void) {
            doTypesMatch = false;
        }

        return validator.atRightOfExpression(providedContext) && doTypesMatch
            ? InsertionType.Valid
            : InsertionType.Invalid;
    }

    getModifierText(): string {
        let str = `.${this.functionName}(`;

        for (let i = 0; i < this.args.length; i++) {
            str += "---";

            if (i !== this.args.length - 1) {
                str += ", ";
            }
        }

        str += ")";

        return str;
    }

    constructFullOperation(varRef: VariableReferenceExpr): Statement | Expression {
        if (this.returns === DataType.Void) {
            return new VarOperationStmt(varRef, [this]);
        } else {
            return new ValueOperationExpr(varRef, [this]);
        }
    }
}

export class AssignmentModifier extends Modifier {
    rootNode: VarOperationStmt;

    constructor(root?: VarOperationStmt, indexInRoot?: number) {
        super();

        this.rootNode = root;
        this.indexInRoot = indexInRoot;

        this.tokens.push(new NonEditableTkn(" = ", this, this.tokens.length));
        this.tokens.push(new TypedEmptyExpr([DataType.Any], this, this.tokens.length));
        this.typeOfHoles[this.tokens.length - 1] = [DataType.Any];
    }

    validateContext(validator: Validator, providedContext: Context): InsertionType {
        // must be after a variable reference that is not been assigned
        // in a statement (not an expression)
        return (providedContext.expressionToLeft instanceof VariableReferenceExpr ||
            providedContext.expressionToLeft instanceof ListAccessModifier ||
            providedContext.expressionToLeft instanceof PropertyAccessorModifier) &&
            providedContext.expressionToLeft.rootNode instanceof VarOperationStmt
            ? InsertionType.Valid
            : InsertionType.Invalid;
    }

    getModifierText(): string {
        return " = ---";
    }

    constructFullOperation(varRef: VariableReferenceExpr): Statement {
        return new VarAssignmentStmt(varRef.uniqueId, varRef.identifier);
    }
}

export class AugmentedAssignmentModifier extends Modifier {
    rootNode: VarOperationStmt;
    private operation: AugmentedAssignmentOperator;

    constructor(operation: AugmentedAssignmentOperator, root?: VarOperationStmt, indexInRoot?: number) {
        super();

        this.operation = operation;

        this.rootNode = root;
        this.indexInRoot = indexInRoot;

        this.tokens.push(new NonEditableTkn(` ${operation} `, this, this.tokens.length));
        this.leftExprTypes = [DataType.Number];

        if (operation == AugmentedAssignmentOperator.Add) this.leftExprTypes.push(DataType.String);

        this.tokens.push(new TypedEmptyExpr(this.leftExprTypes, this, this.tokens.length));
        this.typeOfHoles[this.tokens.length - 1] = [...this.leftExprTypes];

        this.operation = operation;
    }

    validateContext(validator: Validator, providedContext: Context): InsertionType {
        return (providedContext.expressionToLeft instanceof VariableReferenceExpr ||
            providedContext.expressionToLeft instanceof ListAccessModifier ||
            providedContext.expressionToLeft instanceof PropertyAccessorModifier) &&
            providedContext.expressionToLeft.rootNode instanceof VarOperationStmt &&
            this.leftExprTypes.some((type) => type == providedContext.expressionToLeft.returns)
            ? InsertionType.Valid
            : InsertionType.Invalid;
    }

    getModifierText(): string {
        return ` ${this.operation} ---`;
    }

    constructFullOperation(varRef: VariableReferenceExpr): Statement {
        return new VarOperationStmt(varRef, [this]);
    }
}

export class FunctionCallExpr extends Expression implements Importable {
    /**
     * function calls such as `print()` are single-line statements, while `randint()` are expressions and could be used inside a more complex expression, this should be specified when instantiating the `FunctionCallStmt` class.
     */
    private argumentsIndices = new Array<number>();
    functionName: string = "";
    args: Array<Argument>;
    requiredModule: string;

    constructor(
        functionName: string,
        args: Array<Argument>,
        returns: DataType,
        root?: Statement,
        indexInRoot?: number,
        requiredModule: string = ""
    ) {
        super(returns);

        this.rootNode = root;
        this.indexInRoot = indexInRoot;
        this.functionName = functionName;
        this.args = args;
        this.requiredModule = requiredModule;

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

    validateContext(validator: Validator, providedContext: Context): InsertionType {
        if (validator.atLeftOfExpression(providedContext) && this.args.length == 1) {
            // check if we can add to next
            // has only one arg

            const argType = this.args[0].type;
            const canInsertExprIntoThisFunction =
                argType.some((x) => x == DataType.Any) ||
                hasMatch(argType, [providedContext.expressionToRight.returns]);

            if (providedContext.expressionToRight.returns) {
                const map = Util.getInstance().typeConversionMap.get(providedContext.expressionToRight.returns);

                const willItBeDraftMode = hasMatch(map, argType);
                const canFunctionBeInsertedAtCurrentHole =
                    providedContext.expressionToRight.canReplaceWithConstruct(this);

                if (
                    canInsertExprIntoThisFunction &&
                    canFunctionBeInsertedAtCurrentHole.insertionType == InsertionType.Valid
                ) {
                    return InsertionType.Valid;
                } else {
                    const states = [willItBeDraftMode, canFunctionBeInsertedAtCurrentHole.insertionType];

                    if (states.some((s) => s == InsertionType.Invalid)) return InsertionType.Invalid;
                    else if (states.every((s) => s == InsertionType.Valid)) return InsertionType.Valid;
                    else if (states.some((s) => s == InsertionType.DraftMode)) return InsertionType.DraftMode;
                }
            } else return InsertionType.Invalid;
        }

        return validator.atEmptyExpressionHole(providedContext) ? InsertionType.Valid : InsertionType.Invalid;
    }

    replaceArgument(index: number, to: CodeConstruct) {
        this.replace(to, this.argumentsIndices[index]);
    }

    getFunctionName(): string {
        return this.functionName;
    }

    getKeyword(): string {
        return this.functionName;
    }

    validateImport(importedModule: string, importedItem: string): boolean {
        return this.requiredModule === importedModule && this.getFunctionName() === importedItem;
    }

    validateImportOnInsertion(module: Module, currentInsertionType: InsertionType) {
        let insertionType = currentInsertionType;
        let importsOfThisConstruct: ImportStatement[] = [];
        const checker = (construct: CodeConstruct, stmts: ImportStatement[]) => {
            if (
                construct instanceof ImportStatement &&
                this.getLineNumber() > construct.getLineNumber() &&
                this.requiredModule === construct.getImportModuleName()
            ) {
                stmts.push(construct);
            }
        };

        module.performActionOnBFS((code) => checker(code, importsOfThisConstruct));

        if (importsOfThisConstruct.length === 0 && this.requiresImport()) {
            //imports of required module don't exist and this item requires an import
            insertionType = InsertionType.DraftMode;
        } else if (importsOfThisConstruct.length > 0 && this.requiresImport()) {
            //imports of required module exist and this item requires an import
            insertionType =
                importsOfThisConstruct.filter((stmt) => stmt.getImportItemName() === this.getFunctionName()).length > 0
                    ? currentInsertionType
                    : InsertionType.DraftMode;
        }

        return insertionType;
    }

    validateImportFromImportList(imports: ImportStatement[]): boolean {
        const relevantImports = imports.filter(
            (stmt) => stmt.getImportModuleName() === this.requiredModule && this.getLineNumber() > stmt.getLineNumber()
        );

        if (relevantImports.length === 0) {
            return false;
        }

        return relevantImports.filter((stmt) => stmt.getImportItemName() === this.getFunctionName()).length > 0
            ? true
            : false;
    }

    requiresImport(): boolean {
        return this.requiredModule !== "";
    }
}

export interface Importable {
    requiredModule: string;

    validateImport(importedModule: string, importedItem: string): boolean;
    validateImportOnInsertion(module: Module, currentInsertionType: InsertionType): InsertionType;
    validateImportFromImportList(imports: ImportStatement[]): boolean;
    requiresImport(): boolean;
}

export class FunctionCallStmt extends Statement implements Importable {
    /**
     * function calls such as `print()` are single-line statements, while `randint()` are expressions and could be used inside a more complex expression, this should be specified when instantiating the `FunctionCallStmt` class.
     */
    private argumentsIndices = new Array<number>();
    functionName: string = "";
    requiredModule: string;

    constructor(
        functionName: string,
        args: Array<Argument>,
        root?: Statement | Module,
        indexInRoot?: number,
        requiredModule: string = ""
    ) {
        super();

        this.rootNode = root;
        this.indexInRoot = indexInRoot;
        this.functionName = functionName;
        this.requiredModule = requiredModule;

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

    validateContext(validator: Validator, providedContext: Context): InsertionType {
        return validator.onEmptyLine(providedContext) ? InsertionType.Valid : InsertionType.Invalid;
    }

    replaceArgument(index: number, to: CodeConstruct) {
        this.replace(to, this.argumentsIndices[index]);
    }

    getFunctionName(): string {
        return this.functionName;
    }

    getKeyword(): string {
        return this.functionName;
    }

    validateImport(importedModule: string, importedItem: string): boolean {
        return this.requiredModule === importedModule && this.getFunctionName() === importedItem;
    }

    validateImportOnInsertion(module: Module, currentInsertionType: InsertionType) {
        let insertionType = currentInsertionType;
        let importsOfThisConstruct: ImportStatement[] = [];
        const checker = (construct: CodeConstruct, stmts: ImportStatement[]) => {
            if (
                construct instanceof ImportStatement &&
                this.getLineNumber() > construct.getLineNumber() &&
                this.requiredModule === construct.getImportModuleName()
            ) {
                stmts.push(construct);
            }
        };

        module.performActionOnBFS((code) => checker(code, importsOfThisConstruct));

        if (importsOfThisConstruct.length === 0 && this.requiresImport()) {
            //imports of required module don't exist and this item requires an import
            insertionType = InsertionType.DraftMode;
        } else if (importsOfThisConstruct.length > 0 && this.requiresImport()) {
            //imports of required module exist and this item requires an import
            insertionType =
                importsOfThisConstruct.filter((stmt) => stmt.getImportItemName() === this.getFunctionName()).length > 0
                    ? currentInsertionType
                    : InsertionType.DraftMode;
        }

        return insertionType;
    }

    validateImportFromImportList(imports: ImportStatement[]): boolean {
        const relevantImports = imports.filter(
            (stmt) => stmt.getImportModuleName() === this.requiredModule && this.getLineNumber() > stmt.getLineNumber()
        );

        if (relevantImports.length === 0) {
            return false;
        }

        return relevantImports.filter((stmt) => stmt.getImportItemName() === this.getFunctionName()).length > 0
            ? true
            : false;
    }

    requiresImport(): boolean {
        return this.requiredModule !== "";
    }
}

export class ListElementAssignment extends Statement {
    constructor(root?: Expression, indexInRoot?: number) {
        super();

        this.rootNode = root;
        this.indexInRoot = indexInRoot;

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

    validateContext(validator: Validator, providedContext: Context): InsertionType {
        return validator.onEmptyLine(providedContext) ? InsertionType.Valid : InsertionType.Invalid;
    }
}

export class MemberCallStmt extends Expression {
    operator: BinaryOperator;

    constructor(returns: DataType, root?: Statement | Expression, indexInRoot?: number) {
        super(returns);

        this.rootNode = root;
        this.indexInRoot = indexInRoot;

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
        this.tokens.push(new NonEditableTkn("]", this, this.tokens.length));

        this.hasEmptyToken = true;
    }

    validateContext(validator: Validator, providedContext: Context): InsertionType {
        return validator.atEmptyExpressionHole(providedContext) ? InsertionType.Valid : InsertionType.Invalid;
    }
}

export class BinaryOperatorExpr extends Expression {
    operator: BinaryOperator;
    operatorCategory: BinaryOperatorCategory;
    private leftOperandIndex: number;
    private rightOperandIndex: number;

    constructor(operator: BinaryOperator, returns: DataType, root?: Statement | Expression, indexInRoot?: number) {
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

        this.tokens.push(new NonEditableTkn("(", this, this.tokens.length));

        this.leftOperandIndex = this.tokens.length;
        if (this.operatorCategory === BinaryOperatorCategory.Arithmetic && operator == BinaryOperator.Add) {
            if (returns !== DataType.String && returns !== DataType.Number) {
                this.tokens.push(new TypedEmptyExpr([DataType.Number, DataType.String], this, this.tokens.length));
                this.typeOfHoles[this.tokens.length - 1] = [DataType.Number, DataType.String];
                this.keywordIndex = this.tokens.length;
                this.tokens.push(new NonEditableTkn(" " + operator + " ", this, this.tokens.length));
                this.rightOperandIndex = this.tokens.length;
                this.tokens.push(new TypedEmptyExpr([DataType.Number, DataType.String], this, this.tokens.length));
                this.typeOfHoles[this.tokens.length - 1] = [DataType.Number, DataType.String];

                this.returns = DataType.Any;
            } else {
                this.tokens.push(new TypedEmptyExpr([returns], this, this.tokens.length));
                this.typeOfHoles[this.tokens.length - 1] = [returns];
                this.keywordIndex = this.tokens.length;
                this.tokens.push(new NonEditableTkn(" " + operator + " ", this, this.tokens.length));
                this.rightOperandIndex = this.tokens.length;
                this.tokens.push(new TypedEmptyExpr([returns], this, this.tokens.length));
                this.typeOfHoles[this.tokens.length - 1] = [returns];
            }
        } else if (this.operatorCategory === BinaryOperatorCategory.Arithmetic) {
            this.tokens.push(new TypedEmptyExpr([DataType.Number], this, this.tokens.length));
            this.typeOfHoles[this.tokens.length - 1] = [DataType.Number];
            this.keywordIndex = this.tokens.length;
            this.tokens.push(new NonEditableTkn(" " + operator + " ", this, this.tokens.length));
            this.rightOperandIndex = this.tokens.length;
            this.tokens.push(new TypedEmptyExpr([DataType.Number], this, this.tokens.length));
            this.typeOfHoles[this.tokens.length - 1] = [DataType.Number];

            this.returns = DataType.Number;
        } else if (this.operatorCategory === BinaryOperatorCategory.Boolean) {
            this.tokens.push(new TypedEmptyExpr([DataType.Boolean], this, this.tokens.length));
            this.typeOfHoles[this.tokens.length - 1] = [DataType.Boolean];
            this.keywordIndex = this.tokens.length;
            this.tokens.push(new NonEditableTkn(" " + operator + " ", this, this.tokens.length));
            this.rightOperandIndex = this.tokens.length;
            this.tokens.push(new TypedEmptyExpr([DataType.Boolean], this, this.tokens.length));
            this.typeOfHoles[this.tokens.length - 1] = [DataType.Boolean];

            this.returns = DataType.Boolean;
        } else if (this.operatorCategory == BinaryOperatorCategory.Comparison) {
            if (this.operator === BinaryOperator.Equal || this.operator === BinaryOperator.NotEqual) {
                this.tokens.push(new TypedEmptyExpr([DataType.Any], this, this.tokens.length));
                this.typeOfHoles[this.tokens.length - 1] = [DataType.Any];
                this.keywordIndex = this.tokens.length;
                this.tokens.push(new NonEditableTkn(" " + operator + " ", this, this.tokens.length));
                this.rightOperandIndex = this.tokens.length;
                this.tokens.push(new TypedEmptyExpr([DataType.Any], this, this.tokens.length));
                this.typeOfHoles[this.tokens.length - 1] = [DataType.Any];
            } else {
                this.tokens.push(new TypedEmptyExpr([DataType.Number, DataType.String], this, this.tokens.length));
                this.typeOfHoles[this.tokens.length - 1] = [DataType.Number, DataType.String];
                this.keywordIndex = this.tokens.length;
                this.tokens.push(new NonEditableTkn(" " + operator + " ", this, this.tokens.length));
                this.rightOperandIndex = this.tokens.length;
                this.tokens.push(new TypedEmptyExpr([DataType.Number, DataType.String], this, this.tokens.length));
                this.typeOfHoles[this.tokens.length - 1] = [DataType.Number, DataType.String];
            }

            this.returns = DataType.Boolean;
        }

        this.tokens.push(new NonEditableTkn(")", this, this.tokens.length));
        this.hasEmptyToken = true;
    }

    validateContext(validator: Validator, providedContext: Context): InsertionType {
        return validator.atEmptyExpressionHole(providedContext) || // type validation will happen later
            (validator.atLeftOfExpression(providedContext) &&
                !(providedContext.expressionToRight.rootNode instanceof VarOperationStmt) &&
                getAllowedBinaryOperators(providedContext?.expressionToRight?.returns).some(
                    (x) => x === this.operator
                )) ||
            (validator.atRightOfExpression(providedContext) &&
                !(providedContext.expressionToLeft.rootNode instanceof VarOperationStmt) &&
                getAllowedBinaryOperators(providedContext?.expressionToLeft?.returns).some((x) => x === this.operator))
            ? InsertionType.Valid
            : InsertionType.Invalid;
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
                // this.returns = insertCode.returns;

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

        //This is also for inserting any other kind of expression within a bin op. It needs to make other holes within it match the insertion type
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
}

export class UnaryOperatorExpr extends Expression {
    operator: UnaryOp;
    private operandIndex: number;

    constructor(
        operator: UnaryOp,
        returns: DataType,
        operatesOn: DataType = DataType.Any,
        root?: Statement | Expression,
        indexInRoot?: number
    ) {
        super(returns);

        this.rootNode = root;
        this.indexInRoot = indexInRoot;
        this.operator = operator;

        this.tokens.push(new NonEditableTkn("(" + operator + " ", this, this.tokens.length));
        this.operandIndex = this.tokens.length;
        this.tokens.push(new TypedEmptyExpr([operatesOn], this, this.tokens.length));
        this.typeOfHoles[this.tokens.length - 1] = [operatesOn];
        this.tokens.push(new NonEditableTkn(")", this, this.tokens.length));

        this.hasEmptyToken = true;
    }

    validateContext(validator: Validator, providedContext: Context): InsertionType {
        return validator.atEmptyExpressionHole(providedContext) || validator.atLeftOfExpression(providedContext)
            ? InsertionType.Valid
            : InsertionType.Invalid;
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

    getSelection(): Selection {
        const leftPos = this.getLeftPosition();

        return new Selection(leftPos.lineNumber, leftPos.column + this.text.length, leftPos.lineNumber, leftPos.column);
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

    build(pos: Position): Position {
        this.left = pos.column;

        if (this.text.length == 0) {
            console.warn("Do not use any Tokens with 0 textual length.");
            this.right = pos.column;
        } else this.right = pos.column + this.text.length;

        this.notify(CallbackType.change);

        return new Position(pos.lineNumber, this.right);
    }
}

export class LiteralValExpr extends Expression {
    valueTokenIndex: number = 0;

    constructor(returns: DataType, value?: string, root?: Statement | Expression, indexInRoot?: number) {
        super(returns);

        switch (returns) {
            case DataType.String: {
                this.tokens.push(new NonEditableTkn('"', this, this.tokens.length));
                this.tokens.push(
                    new EditableTextTkn(value == undefined ? "" : value, StringRegex, this, this.tokens.length)
                );
                this.tokens.push(new NonEditableTkn('"', this, this.tokens.length));

                this.valueTokenIndex = 1;

                break;
            }

            case DataType.Number: {
                this.tokens.push(
                    new EditableTextTkn(value == undefined ? "" : value, NumberRegex, this, this.tokens.length)
                );
                this.valueTokenIndex = 0;

                break;
            }

            case DataType.Boolean: {
                this.tokens.push(new NonEditableTkn(value, this, this.tokens.length));
                this.valueTokenIndex = 0;

                break;
            }
        }

        this.rootNode = root;
        this.indexInRoot = indexInRoot;
    }

    getValue(): string {
        return (this.tokens[this.valueTokenIndex] as Token).text;
    }

    validateContext(validator: Validator, providedContext: Context): InsertionType {
        return validator.atEmptyExpressionHole(providedContext) ? InsertionType.Valid : InsertionType.Invalid;
    }

    getInitialFocus(): UpdatableContext {
        let newContext = new Context();

        switch (this.returns) {
            case DataType.String:
            case DataType.Number:
                return { positionToMove: new Position(this.lineNumber, this.left + 1) };

            case DataType.Boolean:
                return { positionToMove: new Position(this.lineNumber, this.right) };
        }
    }
}

export class ListLiteralExpression extends Expression {
    constructor(root?: Statement | Expression, indexInRoot?: number) {
        super(DataType.AnyList);

        this.rootNode = root;
        this.indexInRoot = indexInRoot;

        this.tokens.push(new NonEditableTkn("[", this, this.tokens.length));
        this.tokens.push(new TypedEmptyExpr([DataType.Any], this, this.tokens.length));
        this.typeOfHoles[this.tokens.length - 1] = [DataType.Any];
        this.tokens.push(new NonEditableTkn("]", this, this.tokens.length));

        this.hasEmptyToken = true;
    }

    validateContext(validator: Validator, providedContext: Context): InsertionType {
        return validator.atEmptyExpressionHole(providedContext) || validator.atLeftOfExpression(providedContext)
            ? InsertionType.Valid
            : InsertionType.Invalid;
    }

    performTypeUpdatesOnInsertInto(insertCode: Expression) {
        let dataType = this.returns;

        if (this.areAllHolesEmpty()) {
            dataType = TypeChecker.getListTypeFromElementType(insertCode.returns);
        } else if (this.getFilledHolesType() !== insertCode.returns) {
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

    isHolePlacementValid(): boolean {
        const emptyHolePlacements = this.getEmptyHolesWIndex();
        return emptyHolePlacements.length === 0
            ? true
            : emptyHolePlacements.length === 1 && emptyHolePlacements[0][1] === this.tokens.length - 2;
    }

    private getEmptyHolesWIndex(): [TypedEmptyExpr, number][] {
        const holes = [];

        for (let i = 0; i < this.tokens.length; i++) {
            if (this.tokens[i] instanceof TypedEmptyExpr) {
                holes.push([this.tokens[i], this.tokens[i].indexInRoot]);
            }
        }

        return holes;
    }

    private getFilledHolesType(): DataType {
        const elements = this.tokens.filter(
            (tkn) => !(tkn instanceof TypedEmptyExpr) && !(tkn instanceof NonEditableTkn)
        );
        const types: DataType[] = [];

        for (const expr of elements) if (expr instanceof Expression) types.push(expr.returns);

        if (types.length > 0) {
            const initialType = types[0];

            if (types.every((type) => type === initialType)) return initialType;
        }

        return DataType.Any;
    }
}

export class ListComma extends Expression {
    constructor() {
        super(DataType.Void);
    }

    // this is the only reason why we have this ListCommaDummy expression :)
    validateContext(validator: Validator, providedContext: Context): InsertionType {
        return validator.canAddListItemToLeft() || validator.canAddListItemToRight()
            ? InsertionType.Valid
            : InsertionType.Invalid;
    }
}

export class IdentifierTkn extends Token implements TextEditable {
    isTextEditable = true;
    validatorRegex: RegExp;

    constructor(identifier?: string, root?: CodeConstruct, indexInRoot?: number) {
        super(identifier == undefined ? "  " : identifier);

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

export class TemporaryStmt extends Statement {
    constructor(token: CodeConstruct) {
        super();

        token.indexInRoot = this.tokens.length;
        token.rootNode = this;
        this.tokens.push(token);
    }

    validateContext(validator: Validator, providedContext: Context): InsertionType {
        return validator.onBeginningOfLine(providedContext) ? InsertionType.Valid : InsertionType.Invalid;
    }
}

export class AutocompleteTkn extends Token implements TextEditable {
    isTextEditable = true;
    validatorRegex: RegExp = null;
    autocompleteType: AutoCompleteType;
    validMatches: EditCodeAction[];

    constructor(
        firstChar: string,
        autocompleteCategory: AutoCompleteType,
        validMatches: EditCodeAction[],
        root?: CodeConstruct,
        indexInRoot?: number
    ) {
        super(firstChar);

        this.validMatches = validMatches;
        this.autocompleteType = autocompleteCategory;
        this.rootNode = root;
        this.indexInRoot = indexInRoot;
    }

    getEditableText(): string {
        return this.text;
    }

    getLeft(): number {
        return this.left;
    }

    isMatch(): EditCodeAction {
        for (const match of this.validMatches) if (this.text == match.matchString) return match;

        return null;
    }

    isInsertableTerminatingMatch(newChar: string): EditCodeAction {
        for (const match of this.validMatches) {
            if (match.insertableTerminatingCharRegex) {
                for (const matchReg of match.insertableTerminatingCharRegex) {
                    if (this.text == match.matchString && matchReg.test(newChar)) return match;
                }
            }
        }

        return null;
    }

    isTerminatingMatch(): EditCodeAction {
        const newChar = this.text[this.text.length - 1];
        const curText = this.text.substring(0, this.text.length - 1);

        return this.checkMatch(newChar, curText);
    }

    checkMatch(newChar: string, text?: string): EditCodeAction {
        let curText = text !== undefined ? text : this.text;

        for (const match of this.validMatches) {
            if (match.terminatingChars.indexOf(newChar) >= 0) {
                if (match.trimSpacesBeforeTermChar) curText = curText.trim();

                if (curText == match.matchString) return match;
                else if (match.matchRegex != null && match.matchRegex.test(curText)) return match;
            }
        }

        return null;
    }

    setEditedText(text: string): boolean {
        this.text = text;
        (this.rootNode as Expression).rebuild(this.getLeftPosition(), this.indexInRoot);

        return true;
    }
}

export class TypedEmptyExpr extends Token {
    isEmpty = true;
    type: DataType[];

    constructor(type: DataType[], root?: CodeConstruct, indexInRoot?: number) {
        super("    ");

        this.rootNode = root;
        this.indexInRoot = indexInRoot;
        this.type = type;
    }

    canReplaceWithConstruct(replaceWith: Expression): InsertionResult {
        //check if the type of replaceWith can be converted into any of the hole's types
        if (hasMatch(Util.getInstance().typeConversionMap.get(replaceWith.returns), this.type)) {
            const conversionRecords = typeToConversionRecord.has(replaceWith.returns)
                ? typeToConversionRecord
                      .get(replaceWith.returns)
                      .filter((record) => this.type.indexOf(record.convertTo) > -1)
                : [];

            return new InsertionResult(
                InsertionType.DraftMode,
                TYPE_MISMATCH_IN_HOLE_DRAFT_MODE_STR(this.type, replaceWith.returns),
                conversionRecords
            );
        }

        return new InsertionResult(InsertionType.Invalid, "", []);
    }

    isListElement(): boolean {
        return this.rootNode && this.rootNode instanceof ListLiteralExpression;
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

    getSelection(): Selection {
        return this.rootNode.getSelection();
    }
}

export class NonEditableTkn extends Token {
    constructor(text: string, root?: CodeConstruct, indexInRoot?: number) {
        super(text);

        this.rootNode = root;
        this.indexInRoot = indexInRoot;
    }

    getSelection(): Selection {
        return this.rootNode.getSelection();
    }
}

export class KeywordTkn extends Token {
    constructor(text: string, root?: CodeConstruct, indexInRoot?: number) {
        super(text);

        this.rootNode = root;
        this.indexInRoot = indexInRoot;
    }

    getSelection(): Selection {
        return this.rootNode.getSelection();
    }
}

function getAllowedBinaryOperators(type: DataType): Array<BinaryOperator> {
    const allowedBinOps = [BinaryOperator.Equal, BinaryOperator.NotEqual];

    switch (type) {
        case DataType.String: {
            allowedBinOps.push(BinaryOperator.Add);

            allowedBinOps.push(BinaryOperator.GreaterThan);
            allowedBinOps.push(BinaryOperator.GreaterThanEqual);
            allowedBinOps.push(BinaryOperator.LessThan);
            allowedBinOps.push(BinaryOperator.LessThanEqual);

            break;
        }

        case DataType.Number: {
            allowedBinOps.push(BinaryOperator.Add);
            allowedBinOps.push(BinaryOperator.Subtract);
            allowedBinOps.push(BinaryOperator.Multiply);
            allowedBinOps.push(BinaryOperator.Divide);

            allowedBinOps.push(BinaryOperator.GreaterThan);
            allowedBinOps.push(BinaryOperator.GreaterThanEqual);
            allowedBinOps.push(BinaryOperator.LessThan);
            allowedBinOps.push(BinaryOperator.LessThanEqual);

            break;
        }

        case DataType.Boolean: {
            allowedBinOps.push(BinaryOperator.And);
            allowedBinOps.push(BinaryOperator.Or);

            break;
        }
    }

    return allowedBinOps;
}
