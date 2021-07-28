import { TAB_SPACES } from "./consts";
import { Hole } from "../editor/hole";
import * as monaco from "monaco-editor";
import { CallbackType } from "./callback";
import { Editor } from "../editor/editor";
import { Reference, Scope } from "./scope";
import { TypeChecker } from "./type-checker";
import { DraftRecord } from "../editor/draft";
import { Validator } from "../editor/validator";
import { Context, Focus } from "../editor/focus";
import { EventStack } from "../editor/event-stack";
import { rebuildBody, replaceInBody } from "./body";
import { EventRouter } from "../editor/event-router";
import { ActionExecutor } from "../editor/action-executor";
import { MenuController } from "../suggestions/suggestions-controller";
import { ErrorMessage } from "../notification-system/error-msg-generator";
import { AddableType, BinaryOperator, DataType, InsertionType } from "./consts";
import { NotificationSystemController } from "../notification-system/notification-system-controller";
import { ConstructKeys, constructToToolboxButton, emptySpaces, hasMatch, Util } from "../utilities/util";
import {
    BinaryOperatorExpr,
    CodeConstruct,
    ElseStatement,
    EmptyLineStmt,
    ExprDotMethodStmt,
    Expression,
    ForStatement,
    FunctionCallStmt,
    IfStatement,
    MemberCallStmt,
    Statement,
    Token,
    TypedEmptyExpr,
    UnaryOperatorExpr,
    VarAssignmentStmt,
    VariableReferenceExpr,
} from "./ast";

/**
 * The main body of the code which includes an array of statements.
 */
export class Module {
    static draftModeButtonClass = "draftModeButton";

    body = new Array<Statement>();
    focus: Focus;
    validator: Validator;
    executer: ActionExecutor;
    eventRouter: EventRouter;
    eventStack: EventStack;
    editor: Editor;
    variableButtons: HTMLDivElement[] = [];
    notificationSystem: NotificationSystemController;
    menuController: MenuController;
    typeSystem: TypeChecker;

    scope: Scope;
    draftExpressions: DraftRecord[];

    constructor(editorId: string) {
        this.editor = new Editor(document.getElementById(editorId), this);
        this.focus = new Focus(this);
        this.validator = new Validator(this);
        this.executer = new ActionExecutor(this);
        this.typeSystem = new TypeChecker(this);

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
                            button.classList.remove(Module.draftModeButtonClass);
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
                        button.classList.remove(Module.draftModeButtonClass);
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
        code.notify(callbackType);

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
        } else if (code instanceof Token) code.notify(callbackType);
    }

    indentBackStatement(line: Statement) {
        const root = line.rootNode;

        if (root instanceof Statement) {
            if (!line.hasBody()) {
                const removedItem = root.body.splice(line.indexInRoot, 1);

                let outerRoot = root.rootNode as Module | Statement;

                removedItem[0].rootNode = root.rootNode;
                removedItem[0].indexInRoot = root.indexInRoot + 1;
                removedItem[0].build(new monaco.Position(line.lineNumber, line.left - TAB_SPACES));

                outerRoot.body.splice(root.indexInRoot + 1, 0, ...removedItem);
                rebuildBody(this, 0, 1);

                if (line instanceof VarAssignmentStmt) {
                    root.scope.references = root.scope.references.filter((ref) => {
                        ref.statement !== line;
                    });
                }

                outerRoot.scope.references.push(new Reference(line, outerRoot.scope));
            } else {
                const removedItem = root.body.splice(line.indexInRoot, 1);

                let outerRoot = root.rootNode as Module | Statement;

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

                removedItem[0].scope.parentScope = outerRoot.scope;

                outerRoot.body.splice(root.indexInRoot + 1, 0, ...removedItem);
                rebuildBody(this, 0, 1);
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
                rebuildBody(this, 0, 1);

                if (line instanceof VarAssignmentStmt) {
                    root.scope.references = root.scope.references.filter((ref) => {
                        ref.statement !== line;
                    });
                }

                aboveMultilineStmt.scope.references.push(new Reference(line, aboveMultilineStmt.scope));
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
                rebuildBody(this, 0, 1);

                line.scope.parentScope = aboveMultilineStmt.scope;
            }
        }
    }

    removeItems(code: CodeConstruct, start: number, count: number): Array<CodeConstruct> {
        if (code instanceof Statement) {
            const removedItems = code.tokens.splice(start, count);

            for (const item of removedItems) {
                this.recursiveNotify(item, CallbackType.delete);
            }

            code.rebuild(code.getLeftPosition(), 0);

            return removedItems;
        }

        return [];
    }

    removeStatement(line: Statement): CodeConstruct {
        const root = line.rootNode;

        if (root instanceof Module || root instanceof Statement) {
            const replacement = new EmptyLineStmt(root, line.indexInRoot);
            this.recursiveNotify(line, CallbackType.delete);
            root.body.splice(line.indexInRoot, 1, replacement);
            replacement.build(line.getLeftPosition());
            rebuildBody(this, 0, 1);

            return replacement;
        }

        return null;
    }

    deleteLine(line: Statement) {
        const root = line.rootNode;

        if (root instanceof Module || root instanceof Statement) {
            this.recursiveNotify(line, CallbackType.delete);
            root.body.splice(line.indexInRoot, 1);
            rebuildBody(this, 0, 1);
        }
    }

    removeItem(item: CodeConstruct, { replaceType = null }): CodeConstruct {
        const root = item.rootNode;

        if (root instanceof Statement) {
            const replacedItem = new TypedEmptyExpr(replaceType ? replaceType : root.typeOfHoles[item.indexInRoot]);
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

            if (root instanceof Statement && root.tokens.length > 0) {
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

    /**
     * Adds `code` to the body at the given index
     * @param code the statement to be added
     * @param index the index to add the `code` statement
     * @param line the line number that will be given to the newly added statement
     */
    addStatementToBody(bodyContainer: Statement | Module, code: Statement, index: number, line: number) {
        bodyContainer.body.splice(index, 0, code);
        for (let i = index + 1; i < bodyContainer.body.length; i++) bodyContainer.body[i].indexInRoot++;

        rebuildBody(bodyContainer, index + 1, line + code.getHeight());

        this.processNewVariable(code, bodyContainer.scope);

        if (bodyContainer instanceof Statement) {
            bodyContainer.notify(CallbackType.change);
        }
    }

    processNewVariable(statement: Statement, workingScope: Scope) {
        if (statement.hasScope()) statement.scope.parentScope = workingScope;

        if (statement instanceof VarAssignmentStmt) {
            this.addVariableButtonToToolbox(statement);
            workingScope.references.push(new Reference(statement, workingScope));
        }

        if (statement instanceof ForStatement) {
            const varAssignStmt = new VarAssignmentStmt("", statement);
            varAssignStmt.lineNumber = statement.lineNumber;
            statement.buttonId = varAssignStmt.buttonId;

            statement.loopVar = varAssignStmt;

            this.addVariableButtonToToolbox(varAssignStmt);
            statement.scope.references.push(new Reference(varAssignStmt, workingScope));
        }
    }

    insertEmptyLine() {
        const curPos = this.editor.monaco.getPosition();
        const curStatement = this.focus.getFocusedStatement();
        const curStatementRoot = curStatement.rootNode;

        let leftPosToCheck = 1;
        let parentStmtHasBody = false;
        let textToAdd = "\n";
        let spaces = "";
        let atCompoundStmt = false;

        if (curStatementRoot instanceof Statement && curStatementRoot.hasBody()) {
            // is inside the body of another statement
            leftPosToCheck = curStatementRoot.left + TAB_SPACES;
            parentStmtHasBody = true;

            if (leftPosToCheck != 1) {
                for (let i = 0; i < curStatementRoot.left + TAB_SPACES - 1; i++) spaces += " ";
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
            const emptyLine = new EmptyLineStmt(parentStmtHasBody ? curStatementRoot : this, curStatement.indexInRoot);

            emptyLine.build(curStatement.getLeftPosition());

            if (parentStmtHasBody) {
                this.addStatementToBody(
                    curStatementRoot as Statement,
                    emptyLine,
                    curStatement.indexInRoot,
                    curStatement.lineNumber
                );
            } else this.addStatementToBody(this, emptyLine, curStatement.indexInRoot, curStatement.lineNumber);

            const range = new monaco.Range(curStatement.lineNumber - 1, 1, curStatement.lineNumber - 1, 1);
            this.editor.executeEdits(range, null, spaces + textToAdd);
        } else {
            // insert emptyStatement on next line, move other statements down
            const emptyLine = new EmptyLineStmt(
                parentStmtHasBody ? curStatementRoot : this,
                curStatement.indexInRoot + 1
            );
            emptyLine.build(new monaco.Position(curStatement.lineNumber + 1, leftPosToCheck));

            if (parentStmtHasBody && atCompoundStmt) {
                emptyLine.indexInRoot = 0;
                emptyLine.rootNode = curStatement;
                this.addStatementToBody(curStatement as Statement, emptyLine, 0, curStatement.lineNumber + 1);
            } else if (parentStmtHasBody) {
                this.addStatementToBody(
                    curStatementRoot as Statement,
                    emptyLine,
                    curStatement.indexInRoot + 1,
                    curStatement.lineNumber + 1
                );
            } else this.addStatementToBody(this, emptyLine, curStatement.indexInRoot + 1, curStatement.lineNumber + 1);

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
    updateDraftModeToolboxButtons(insertInto: CodeConstruct, constructs: Array<ConstructKeys>) {
        const dummyConstructs = Util.getInstance(this).dummyToolboxConstructs;
        for (const construct of constructs) {
            const constructButton = document.getElementById(constructToToolboxButton.get(construct));

            if (this.tryInsert(insertInto, dummyConstructs.get(construct)) === InsertionType.DraftMode) {
                constructButton.classList.add(Module.draftModeButtonClass);
            } else {
                constructButton.classList.remove(Module.draftModeButtonClass);
            }
        }
    }

    updateDraftModeToolboxVarButtons(refs: any[]) {
        for (const ref of refs) {
            const button = document.getElementById(((ref[0] as Reference).statement as VarAssignmentStmt).buttonId);
            if (ref[1] === InsertionType.DraftMode) {
                button.classList.add(Module.draftModeButtonClass);
            } else {
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
                const insertionType = this.tryInsert(
                    focusedNode,
                    Util.getInstance(this).dummyToolboxConstructs.get(ConstructKeys[key])
                );

                validInserts.set(ConstructKeys[key], insertionType === InsertionType.Invalid ? false : true);
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
                    this.tryInsert(
                        focusedNode,
                        Util.getInstance(this).dummyToolboxConstructs.get(ConstructKeys[key])
                    ) !== InsertionType.Invalid
                ) {
                    validInsertsList.push(ConstructKeys[key]);
                }
            });
        } catch (e) {
            console.error("Unable to get valid inserts list for:");
            console.error(focusedNode);
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
        const context = this.focus.getContext();

        // TODO: Workaround for now to test ExprDotMethodStmt statements

        if (insert instanceof ExprDotMethodStmt) {
            if (insert.validateContext(this.validator, context) == InsertionType.Valid) {
                return context.expressionToLeft.canReplaceWithConstruct(insert);
            }

            return InsertionType.Invalid;
        }

        if (!insertInto || !insert) {
            console.error(
                "Failed to perform insertion check on\n   insertInto: " + insertInto + "\n   insert: " + insert
            );
            return null;
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
                else {
                    return InsertionType.Invalid;
                }
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
                    if (
                        insertInto.type.indexOf(DataType.String) > -1 ||
                        insertInto.type.indexOf(DataType.Number) > -1 ||
                        insertInto.type.indexOf(DataType.Any) > -1
                    ) {
                        return InsertionType.Valid;
                    } else if (
                        hasMatch(Util.getInstance(this).typeConversionMap.get(insert.returns), insertInto.type)
                    ) {
                        return InsertionType.DraftMode;
                    }
                }

                //type checks -- different handling based on type of code construct
                //insertInto.returns != code.returns would work, but we need more context to get the right error message
                //Insertion of an Expression into a TypedEmptyExpr contained within some other Expression or Statement
                if (isValid && insertInto instanceof TypedEmptyExpr && insert instanceof Expression) {
                    //inserting an Expression into a TypedEmptyExpr of a BinaryBoolOperatorExpr
                    if (insertInto.rootNode instanceof BinaryOperatorExpr && insertInto.rootNode.isBoolean()) {
                        if (
                            insert.returns != DataType.Boolean &&
                            Util.getInstance(this).typeConversionMap.get(insert.returns).indexOf(insert.returns)
                        )
                            return InsertionType.DraftMode;
                        return InsertionType.Valid;
                    }
                    //for-loop check is special since Iterable does not cover both str and list right now
                    //can change it once the types are an array
                    //inserting an Expression into the second hole of a for-loop
                    else if (insertInto.rootNode instanceof ForStatement) {
                        if (this.typeSystem.validateForLoopIterableInsertionType(insert)) {
                            return InsertionType.Valid;
                        } else if (
                            hasMatch(
                                Util.getInstance(this).typeConversionMap.get(insert.returns),
                                TypeChecker.listTypes
                            )
                        ) {
                            return InsertionType.DraftMode;
                        }
                    } else {
                        if (
                            insertInto.type.indexOf(insert.returns) > -1 ||
                            insertInto.type.indexOf(DataType.Any) > -1
                        ) {
                            return InsertionType.Valid;
                        } else if (
                            hasMatch(Util.getInstance(this).typeConversionMap.get(insert.returns), insertInto.type)
                        ) {
                            return InsertionType.DraftMode;
                        } else {
                            return InsertionType.Invalid;
                        }
                    }
                }

                //type check for binary ops (separate from above because they don't use TypedEmptyExpressions)
                let existingLiteralType = null;
                if (
                    insertInto.rootNode instanceof BinaryOperatorExpr &&
                    !insertInto.rootNode.isBoolean() &&
                    insert instanceof Expression
                ) {
                    //record the type of any hole that is already filled
                    if (insertInto.rootNode.getLeftOperand() instanceof Expression) {
                        existingLiteralType = (insertInto.rootNode.getLeftOperand() as Expression).returns;
                    } else if (insertInto.rootNode.getRightOperand() instanceof Expression) {
                        existingLiteralType = (insertInto.rootNode.getRightOperand() as Expression).returns;
                    }

                    if (existingLiteralType != null && existingLiteralType != insert.returns) {
                        return InsertionType.Valid;
                    } else if (
                        existingLiteralType != null &&
                        Util.getInstance(this).typeConversionMap.get(insert.returns).indexOf(existingLiteralType)
                    ) {
                        return InsertionType.DraftMode;
                    }
                }

                return InsertionType.Valid;
            }
        } else return InsertionType.Invalid;
    }

    ///------------------VALIDATOR END

    insert(code: CodeConstruct, insertInto?: CodeConstruct) {
        const context = this.focus.getContext();
        const focusedNode = insertInto ?? this.focus.onEmptyLine() ? context.lineStatement : context.token;

        const insertionType =
            code instanceof VariableReferenceExpr
                ? (Validator.getValidVariableReferences(focusedNode)
                      .filter(
                          (record) =>
                              ((record[0] as Reference).statement as VarAssignmentStmt).buttonId ===
                              (code as VariableReferenceExpr).uniqueId
                      )
                      .map((record) => record[1])[0] as InsertionType)
                : (this.tryInsert(focusedNode, code) as InsertionType);

        let isValid = false;

        if (focusedNode) {
            if (
                code.addableType != AddableType.NotAddable &&
                focusedNode.receives.indexOf(code.addableType) > -1 &&
                insertionType !== InsertionType.DraftMode
            ) {
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
                            replaceInBody(parentRoot, focusedNode.indexInRoot, statement);
                            parentRoot.notify(CallbackType.replace);

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
                        replaceInBody(this, focusedNode.indexInRoot, statement);

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

                    const newContext = code.getInitialFocus();
                    this.focus.updateContext(newContext);
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
                        isValid = focusedNode.rootNode.typeValidateInsertionIntoHole(
                            code,
                            true,
                            focusedNode,
                            this.notificationSystem
                        );

                        if (isValid) {
                            code.performPreInsertionUpdates(focusedNode);

                            if (code.rootNode instanceof Statement) {
                                code.rootNode.onInsertInto(code);
                            }

                            if (focusedNode.rootNode instanceof ForStatement) {
                                this.typeSystem.updateForLoopVarType(focusedNode.rootNode, code); //TODO: should be placed inside of doOnInsert() which is a method of all CodeConstructs
                            }
                            //This is for ListLiterals when their parent is a variable.
                            //It needs to be refactored along with the rest of similar updates so that anything that has a rootNode that is a
                            //VarAssignment changes the vars dataType.

                            //Every expression needs to have this if it is being assigned to a var. So could put it inside Expression.
                            if (
                                focusedNode.rootNode.rootNode &&
                                focusedNode.rootNode.rootNode instanceof VarAssignmentStmt
                            ) {
                                const newType = TypeChecker.getListTypeFromElementType(code.returns);
                                this.typeSystem.updateDataTypeOfVarRefInToolbox(focusedNode.rootNode.rootNode, newType);
                            }

                            //inserting a list identifier into a MemberCallStmt needs to update the variable's type if it is being assigned to one
                            if (
                                focusedNode.rootNode instanceof MemberCallStmt &&
                                focusedNode.rootNode.rootNode instanceof VarAssignmentStmt &&
                                focusedNode instanceof TypedEmptyExpr
                            ) {
                                const newType = TypeChecker.getElementTypeFromListType((code as Expression).returns);
                                this.typeSystem.updateDataTypeOfVarRefInToolbox(focusedNode.rootNode.rootNode, newType);
                            }
                        }
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

                        //TODO: This should probably run only if the insert above was successful, we cannot assume that it was
                        if (!focusedNode.notification) {
                            const newContext = code.getInitialFocus();
                            this.focus.updateContext(newContext);
                        }
                    }
                }
            } else {
                //TODO: This type of logic should not be inside the  It should be moved somewhere like a validator class or even the notification-system-controller.
                //However with the current architecture this is the best solution. The AST has all the information needed to make these decisions.
                if (code.addableType == AddableType.NotAddable) {
                    console.warn("Cannot insert this code construct at focused location.");

                    this.notificationSystem.addHoverNotification(focusedNode, {}, "", ErrorMessage.default);
                } else if (
                    focusedNode.receives.indexOf(code.addableType) == -1 &&
                    insertionType == InsertionType.Invalid
                ) {
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
                            focusedNode.rootNode instanceof BinaryOperatorExpr ||
                            focusedNode.rootNode instanceof UnaryOperatorExpr
                        ) {
                            this.notificationSystem.addHoverNotification(
                                focusedNode,
                                { addedType: code.addableType },
                                "",
                                ErrorMessage.addableTypeMismatchGeneral
                            );
                        } else {
                            if (focusedNode.rootNode instanceof VarAssignmentStmt) {
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
                } else if (insertionType === InsertionType.DraftMode && code instanceof Expression) {
                    const focusedPos = this.focus.onEmptyLine()
                        ? context.lineStatement.getLeftPosition()
                        : context.token.getLeftPosition();

                    if (code instanceof VariableReferenceExpr && focusedNode instanceof EmptyLineStmt) {
                        replaceInBody(this, focusedNode.indexInRoot, code);
                    } else {
                        this.replaceFocusedExpression(code);
                    }

                    //TODO: Should we include the parent too?
                    this.openDraftMode(code);

                    const range = new monaco.Range(
                        focusedPos.lineNumber,
                        focusedNode.left,
                        focusedPos.lineNumber,
                        focusedNode.right
                    );

                    this.editor.executeEdits(range, code);
                } else {
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

    closeConstructDraftRecord(code: CodeConstruct) {
        if (code.draftModeEnabled) {
            code.draftModeEnabled = false;
            const removedRecord = this.draftExpressions.splice(this.draftExpressions.indexOf(code.draftRecord), 1)[0];

            if (removedRecord.warning) removedRecord.removeNotification();

            code.draftRecord = null;
        } else {
            console.warn("Tried closing draft mode of construct that did not have one open.");
        }
    }

    openDraftMode(code: Expression) {
        code.draftModeEnabled = true;
        this.draftExpressions.push(new DraftRecord(code, this));
        code.draftRecord = this.draftExpressions[this.draftExpressions.length - 1];
    }
}
