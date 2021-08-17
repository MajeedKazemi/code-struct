import { Position, Range } from "monaco-editor";
import { ErrorMessage } from "../notification-system/error-msg-generator";
import {
    AssignmentModifier,
    AutocompleteTkn,
    BinaryOperatorExpr,
    CodeConstruct,
    ElseStatement,
    EmptyLineStmt,
    Expression,
    IdentifierTkn,
    ListAccessModifier,
    ListLiteralExpression,
    LiteralValExpr,
    Modifier,
    NonEditableTkn,
    Statement,
    TemporaryStmt,
    Token,
    TypedEmptyExpr,
    ValueOperationExpr,
    VarAssignmentStmt,
    VariableReferenceExpr,
    VarOperationStmt,
} from "../syntax-tree/ast";
import { rebuildBody, replaceInBody } from "../syntax-tree/body";
import { Callback, CallbackType } from "../syntax-tree/callback";
import { AutoCompleteType, BuiltInFunctions, PythonKeywords, TAB_SPACES } from "../syntax-tree/consts";
import { Module } from "../syntax-tree/module";
import { Reference } from "../syntax-tree/scope";
import { TypeChecker } from "../syntax-tree/type-checker";
import { BinaryOperator, DataType, InsertionType } from "./../syntax-tree/consts";
import { EditCodeAction } from "./action-filter";
import { EditActionType } from "./consts";
import { EditAction } from "./data-types";
import { Context } from "./focus";

export class ActionExecutor {
    module: Module;

    constructor(module: Module) {
        this.module = module;
    }

    execute(action: EditAction, providedContext?: Context, pressedKey?: string): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();
        const selection = this.module.editor.monaco.getSelection();

        let suggestions = [];
        let preventDefaultEvent = true;

        switch (action.type) {
            case EditActionType.OpenAutocomplete: {
                if (action.data.autocompleteType == AutoCompleteType.StartOfLine) {
                    const autocompleteTkn = new AutocompleteTkn(
                        action.data.firstChar,
                        action.data.autocompleteType,
                        action.data.validMatches
                    );

                    autocompleteTkn.subscribe(
                        CallbackType.change,
                        new Callback(
                            (() => {
                                this.module.menuController.updateMenuOptions(autocompleteTkn.getEditableText());

                                const pos = { left: 0, top: 0 };
                                pos.left = pos.left =
                                    document.getElementById("editor").offsetLeft +
                                    (
                                        document
                                            .getElementById("editor")
                                            .getElementsByClassName(
                                                "monaco-editor no-user-select  showUnused showDeprecated vs"
                                            )[0]
                                            .getElementsByClassName("overflow-guard")[0]
                                            .getElementsByClassName("margin")[0] as HTMLElement
                                    ).offsetWidth +
                                    autocompleteTkn.getRenderText().length * this.module.editor.computeCharWidth();
                                pos.top =
                                    this.module.editor.monaco.getSelection().startLineNumber *
                                        this.module.editor.computeCharHeight() +
                                    parseFloat(window.getComputedStyle(document.getElementById("editor")).paddingTop);

                                this.module.menuController.updatePosition(pos);
                            }).bind(this)
                        )
                    );
                    this.openAutocompleteMenu(action.data.validMatches);

                    this.insertStatement(context, new TemporaryStmt(autocompleteTkn));
                }

                break;
            }

            case EditActionType.InsertElseStatement: {
                const newStatement = new ElseStatement(action.data.hasCondition);

                if (action.data.outside) {
                    // when the else is being inserted outside
                    const elseRoot = context.lineStatement.rootNode as Module | Statement;
                    newStatement.rootNode = elseRoot;
                    newStatement.indexInRoot = context.lineStatement.indexInRoot;
                    newStatement.body.push(new EmptyLineStmt(newStatement, 0));

                    replaceInBody(elseRoot, newStatement.indexInRoot, newStatement);
                    rebuildBody(elseRoot, newStatement.indexInRoot, context.lineStatement.lineNumber);
                    this.module.editor.executeEdits(this.getBoundaries(context.lineStatement), newStatement);
                } else {
                    // when being inserted inside
                    const curStmtRoot = context.lineStatement.rootNode as Statement;
                    const elseRoot = curStmtRoot.rootNode as Module | Statement;
                    newStatement.rootNode = elseRoot;
                    newStatement.indexInRoot = curStmtRoot.indexInRoot + 1;

                    // indent back and place all of the code below it as its child
                    const toMoveStatements = curStmtRoot.body.splice(
                        context.lineStatement.indexInRoot,
                        curStmtRoot.body.length - context.lineStatement.indexInRoot
                    );

                    // remove the empty line statement
                    toMoveStatements.splice(0, 1)[0];

                    if (toMoveStatements.length == 0) newStatement.body.push(new EmptyLineStmt(newStatement, 0));
                    const providedLeftPos = new Position(
                        context.lineStatement.lineNumber,
                        context.lineStatement.left - TAB_SPACES
                    );
                    newStatement.build(providedLeftPos);

                    this.module.editor.executeEdits(
                        this.getBoundaries(context.lineStatement, { selectIndent: true }),
                        newStatement
                    );

                    const topReferences = new Array<Reference>();
                    const bottomReferences = new Array<Reference>();

                    for (const ref of curStmtRoot.scope.references) {
                        if (ref.statement.indexInRoot > context.lineStatement.indexInRoot) {
                            bottomReferences.push(ref);
                        } else topReferences.push(ref);
                    }

                    if (bottomReferences.length > 0) {
                        curStmtRoot.scope.references = topReferences;
                        newStatement.scope.references = bottomReferences;
                    }

                    for (const [i, stmt] of toMoveStatements.entries()) {
                        stmt.rootNode = newStatement;
                        stmt.indexInRoot = i;
                        newStatement.body.push(stmt);
                    }

                    newStatement.init(providedLeftPos);
                    newStatement.rootNode = elseRoot;
                    newStatement.indexInRoot = newStatement.indexInRoot;
                    this.module.addStatementToBody(
                        elseRoot,
                        newStatement,
                        newStatement.indexInRoot,
                        providedLeftPos.lineNumber
                    );
                }

                break;
            }

            case EditActionType.InsertExpression: {
                this.insertExpression(context, action.data?.expression);

                break;
            }

            case EditActionType.InsertStatement: {
                const statement = action.data?.statement;

                this.insertStatement(context, statement as Statement);

                break;
            }

            case EditActionType.InsertVarAssignStatement: {
                //TODO: Might want to change back to use the case above if no new logic is added
                const statement = action.data?.statement;

                if (statement instanceof VarAssignmentStmt && action.data?.autocompleteData?.identifier) {
                    statement.setIdentifier(action.data?.autocompleteData?.identifier);
                }

                this.insertStatement(context, action.data?.statement as Statement);

                break;
            }

            case EditActionType.InsertUnaryOperator: {
                // TODO
                if (action.data?.replace) {
                    console.log("insert unary op - replace");
                } else if (action.data?.wrap) {
                    console.log("insert unary op - wrap");
                }

                break;
            }

            case EditActionType.DeleteNextToken: {
                if (this.module.validator.atBeginningOfValOperation(context)) {
                    this.deleteCode(context.expressionToRight.rootNode);
                } else if (context.expressionToRight instanceof Modifier) {
                    this.deleteModifier(context.expressionToRight, { deleting: true });
                } else this.deleteCode(context.expressionToRight);

                break;
            }

            case EditActionType.DeletePrevToken: {
                if (
                    context.expressionToLeft instanceof VariableReferenceExpr &&
                    context.expressionToLeft.rootNode instanceof VarOperationStmt
                ) {
                    this.deleteCode(context.expressionToLeft.rootNode, { statement: true });
                } else if (context.expressionToLeft instanceof Modifier) this.deleteModifier(context.expressionToLeft);
                else this.deleteCode(context.expressionToLeft);

                break;
            }

            case EditActionType.DeleteStatement: {
                this.deleteCode(context.lineStatement, { statement: true });

                break;
            }

            case EditActionType.DeleteCurLine: {
                this.module.deleteLine(context.lineStatement);
                let range: Range;

                if (action.data?.pressedBackspace) {
                    const lineAbove = this.module.focus.getStatementAtLineNumber(context.lineStatement.lineNumber - 1);
                    this.module.focus.updateContext({
                        positionToMove: new Position(lineAbove.lineNumber, lineAbove.right),
                    });
                    range = new Range(
                        context.lineStatement.lineNumber,
                        context.lineStatement.left,
                        lineAbove.lineNumber,
                        lineAbove.right
                    );
                } else {
                    range = new Range(
                        context.lineStatement.lineNumber,
                        context.lineStatement.left,
                        context.lineStatement.lineNumber + 1,
                        context.lineStatement.left
                    );
                }

                this.module.editor.executeEdits(range, null, "");

                break;
            }

            case EditActionType.DeletePrevLine: {
                const prevLine = this.module.focus.getStatementAtLineNumber(context.lineStatement.lineNumber - 1);
                const deleteRange = new Range(
                    prevLine.lineNumber,
                    prevLine.left,
                    prevLine.lineNumber + 1,
                    prevLine.left
                );
                this.module.deleteLine(prevLine);
                this.module.editor.executeEdits(deleteRange, null, "");

                break;
            }

            case EditActionType.IndentBackwardsIfStmt: {
                const root = context.lineStatement.rootNode as Statement | Module;

                const toIndentStatements = new Array<Statement>();

                for (let i = context.lineStatement.indexInRoot; i < root.body.length; i++) {
                    toIndentStatements.push(root.body[i]);
                }

                for (const stmt of toIndentStatements.reverse()) {
                    this.module.editor.indentRecursively(stmt, { backward: true });
                    this.module.indentBackStatement(stmt);
                }

                break;
            }

            case EditActionType.IndentBackwards: {
                this.module.editor.indentRecursively(context.lineStatement, { backward: true });
                this.module.indentBackStatement(context.lineStatement);

                break;
            }

            case EditActionType.IndentForwardsIfStmt: {
                const root = context.lineStatement.rootNode as Statement | Module;

                const toIndentStatements = new Array<Statement>();

                for (let i = context.lineStatement.indexInRoot; i < root.body.length; i++) {
                    toIndentStatements.push(root.body[i]);

                    if (i + 1 < root.body.length && !(root.body[i + 1] instanceof ElseStatement)) break;
                }

                for (const stmt of toIndentStatements) {
                    this.module.editor.indentRecursively(stmt, { backward: false });
                    this.module.indentForwardStatement(stmt);
                }

                break;
            }

            case EditActionType.IndentForwards: {
                this.module.editor.indentRecursively(context.lineStatement, { backward: false });
                this.module.indentForwardStatement(context.lineStatement);

                break;
            }

            case EditActionType.InsertEmptyLine: {
                const newEmptyLine = this.module.insertEmptyLine();
                this.module.focus.fireOnNavOffCallbacks(context.lineStatement, newEmptyLine);

                break;
            }

            case EditActionType.SelectPrevToken: {
                this.module.focus.navigateLeft();

                break;
            }

            case EditActionType.SelectNextToken: {
                this.module.focus.navigateRight();

                break;
            }

            case EditActionType.InsertChar: {
                const cursorPos = this.module.editor.monaco.getPosition();
                const selectedText = this.module.editor.monaco.getSelection();
                const token = this.module.focus.getTextEditableItem(context);
                const editableText = token.getEditableText();
                let newText = "";

                if (editableText == "   ") {
                    const curText = "";
                    newText = curText + pressedKey;
                } else {
                    const curText = editableText.split("");
                    curText.splice(
                        cursorPos.column - token.getLeft(),
                        Math.abs(selectedText.startColumn - selectedText.endColumn),
                        pressedKey
                    );

                    newText = curText.join("");
                }

                this.validateIdentifier(context, newText);

                let editRange: Range;

                if (selectedText.startColumn != selectedText.endColumn) {
                    editRange = new Range(
                        cursorPos.lineNumber,
                        selectedText.startColumn,
                        cursorPos.lineNumber,
                        selectedText.endColumn
                    );
                } else if (context.tokenToRight?.isTextEditable && editableText == "   ") {
                    editRange = new Range(
                        cursorPos.lineNumber,
                        context.tokenToRight.left,
                        cursorPos.lineNumber,
                        context.tokenToRight.right
                    );
                } else {
                    editRange = new Range(
                        cursorPos.lineNumber,
                        cursorPos.column,
                        cursorPos.lineNumber,
                        cursorPos.column
                    );
                }

                if (token instanceof AutocompleteTkn) {
                    const match = token.getMatch(pressedKey);

                    if (match) {
                        this.deleteCode(token, {
                            statement: token.autocompleteType == AutoCompleteType.StartOfLine,
                        });
                        match.performAction(this, this.module.eventRouter, context, { identifier: token.text });

                        break;
                    }
                }

                if (token.setEditedText(newText)) this.module.editor.executeEdits(editRange, null, pressedKey);

                break;
            }

            case EditActionType.DeletePrevChar:
            case EditActionType.DeleteNextChar: {
                const cursorPos = this.module.editor.monaco.getPosition();
                const selectedText = this.module.editor.monaco.getSelection();
                const token = this.module.focus.getTextEditableItem(context);

                let newText = "";

                const curText = token.getEditableText().split("");
                const toDeleteItems =
                    selectedText.startColumn == selectedText.endColumn
                        ? 1
                        : Math.abs(selectedText.startColumn - selectedText.endColumn);

                const toDeletePos = action.type == EditActionType.DeleteNextChar ? 0 : 1;

                curText.splice(
                    Math.min(
                        cursorPos.column - token.getLeft() - toDeletePos,
                        selectedText.startColumn - token.getLeft() - toDeletePos
                    ),
                    toDeleteItems
                );

                newText = curText.join("");

                this.validateIdentifier(context, newText);

                // check if it needs to turn back into a hole:
                if (newText.length == 0) {
                    let literalExpr: LiteralValExpr = null;

                    if (context.expression instanceof LiteralValExpr) {
                        literalExpr = context.expression;
                    } else if (context.expressionToLeft instanceof LiteralValExpr) {
                        literalExpr = context.expressionToLeft;
                    } else if (context.expressionToRight instanceof LiteralValExpr) {
                        literalExpr = context.expressionToRight;
                    }

                    if (literalExpr != null) {
                        this.deleteCode(literalExpr);

                        break;
                    }

                    let identifier: IdentifierTkn = null;
                    if (context.tokenToLeft instanceof IdentifierTkn) {
                        identifier = context.tokenToLeft;
                    } else if (context.tokenToRight instanceof IdentifierTkn) {
                        identifier = context.tokenToRight;
                    } else if (context.token instanceof IdentifierTkn) {
                        identifier = context.token;
                    }

                    if (identifier != null) {
                        identifier.text = "   ";
                        identifier.isEmpty = true;
                        this.module.editor.executeEdits(
                            new Range(cursorPos.lineNumber, identifier.left, cursorPos.lineNumber, identifier.right),
                            null,
                            "   "
                        );
                        context.lineStatement.build(context.lineStatement.getLeftPosition());
                        this.module.focus.updateContext({ tokenToSelect: identifier });

                        break;
                    }
                }

                if (token.setEditedText(newText)) {
                    let editRange = new Range(
                        cursorPos.lineNumber,
                        cursorPos.column,
                        cursorPos.lineNumber,
                        cursorPos.column
                    );

                    if (selectedText.startColumn != selectedText.endColumn) {
                        editRange = new Range(
                            cursorPos.lineNumber,
                            selectedText.startColumn,
                            cursorPos.lineNumber,
                            selectedText.endColumn - 1
                        );
                    }

                    this.module.editor.executeEdits(editRange, null, "");
                    preventDefaultEvent = false;
                }

                break;
            }

            case EditActionType.InsertAssignmentModifier: {
                if (context.expressionToLeft.rootNode instanceof VarOperationStmt) {
                    const varOpStmt = context.expressionToLeft.rootNode;

                    if (
                        action.data.modifier instanceof AssignmentModifier &&
                        context.expressionToLeft instanceof VariableReferenceExpr
                    ) {
                        const initialBoundary = this.getBoundaries(context.expressionToLeft);

                        const varAssignStmt = new VarAssignmentStmt(
                            "",
                            context.expressionToLeft.identifier,
                            varOpStmt.rootNode,
                            varOpStmt.indexInRoot
                        );

                        replaceInBody(varOpStmt.rootNode, varOpStmt.indexInRoot, varAssignStmt);

                        this.module.editor.executeEdits(initialBoundary, varAssignStmt);
                        this.module.focus.updateContext(varAssignStmt.getInitialFocus());
                    } else {
                        varOpStmt.appendModifier(action.data.modifier);
                        varOpStmt.rebuild(varOpStmt.getLeftPosition(), 0);

                        this.module.editor.insertAtCurPos([action.data.modifier]);
                        this.module.focus.updateContext(action.data.modifier.getInitialFocus());
                    }
                }

                break;
            }

            case EditActionType.InsertModifier: {
                const modifier = action.data.modifier as Modifier;

                if (context.expressionToLeft instanceof Modifier) {
                    if (context.expressionToLeft.rootNode instanceof ValueOperationExpr) {
                        const valOprExpr = context.expressionToLeft.rootNode;
                        const valOprExprRoot = valOprExpr.rootNode as Statement;

                        let replacementType = valOprExpr.rootNode.checkInsertionAtHole(
                            valOprExpr.indexInRoot,
                            modifier.returns
                        );

                        if (replacementType !== InsertionType.Invalid) {
                            valOprExpr.appendModifier(modifier);
                            valOprExprRoot.rebuild(valOprExprRoot.getLeftPosition(), 0);

                            this.module.editor.insertAtCurPos([modifier]);
                            this.module.focus.updateContext(modifier.getInitialFocus());

                            if (replacementType == InsertionType.DraftMode) this.module.openDraftMode(valOprExpr);
                        }

                        if (valOprExpr.rootNode instanceof Statement) valOprExpr.rootNode.onInsertInto(valOprExpr);
                    }
                } else if (
                    context.expressionToLeft instanceof VariableReferenceExpr &&
                    context.expressionToLeft.rootNode instanceof VarOperationStmt
                ) {
                    const varOpStmt = context.expressionToLeft.rootNode;

                    varOpStmt.appendModifier(modifier);
                    varOpStmt.rebuild(varOpStmt.getLeftPosition(), 0);

                    this.module.editor.insertAtCurPos([modifier]);
                    this.module.focus.updateContext(modifier.getInitialFocus());
                } else {
                    const exprToLeftRoot = context.expressionToLeft.rootNode as Statement;
                    const exprToLeftIndexInRoot = context.expressionToLeft.indexInRoot;

                    if (modifier instanceof ListAccessModifier) {
                        modifier.returns = TypeChecker.getElementTypeFromListType(context.expressionToLeft.returns);

                        if (!modifier.returns) modifier.returns = DataType.Any;
                    }

                    const replacementType = exprToLeftRoot.checkInsertionAtHole(
                        context.expressionToLeft.indexInRoot,
                        modifier.returns
                    );

                    const valOprExpr = new ValueOperationExpr(
                        context.expressionToLeft,
                        [modifier],
                        context.expressionToLeft.rootNode,
                        context.expressionToLeft.indexInRoot
                    );

                    if (valOprExpr.rootNode instanceof Statement) valOprExpr.rootNode.onInsertInto(valOprExpr);

                    context.expressionToLeft.indexInRoot = 0;
                    context.expressionToLeft.rootNode = valOprExpr;

                    if (replacementType !== InsertionType.Invalid) {
                        this.module.closeConstructDraftRecord(context.expressionToLeft);

                        exprToLeftRoot.tokens[exprToLeftIndexInRoot] = valOprExpr;
                        exprToLeftRoot.rebuild(exprToLeftRoot.getLeftPosition(), 0);

                        this.module.editor.insertAtCurPos([modifier]);
                        this.module.focus.updateContext(modifier.getInitialFocus());

                        if (replacementType == InsertionType.DraftMode) this.module.openDraftMode(valOprExpr);
                    }
                }

                break;
            }

            case EditActionType.InsertBinaryOperator: {
                if (action.data.toRight) {
                    this.replaceWithBinaryOp(action.data.operator, context.expressionToLeft, { toLeft: true });
                } else if (action.data.toLeft) {
                    this.replaceWithBinaryOp(action.data.operator, context.expressionToRight, { toRight: true });
                } else if (action.data.replace) {
                    this.insertExpression(
                        context,
                        new BinaryOperatorExpr(action.data.operator, (context.token as TypedEmptyExpr).type[0])
                    );
                }

                break;
            }

            case EditActionType.WrapExpressionWithItem: {
                // both lists and str work on any, so the first step of validation is always OK.

                const initialBoundary = this.getBoundaries(context.expressionToRight);
                const expr = context.expressionToRight as Expression;
                const indexInRoot = expr.indexInRoot;
                const root = expr.rootNode as Statement;

                const newCode = action.data.expression as Expression;
                newCode.indexInRoot = expr.indexInRoot;
                newCode.rootNode = expr.rootNode;

                const isValidRootInsertion =
                    newCode.returns == DataType.Any ||
                    root.typeOfHoles[indexInRoot].indexOf(newCode.returns) >= 0 ||
                    root.typeOfHoles[indexInRoot] == DataType.Any;

                let replaceIndex: number = 0;

                for (const [i, token] of newCode.tokens.entries()) {
                    if (token instanceof TypedEmptyExpr) {
                        replaceIndex = i;

                        break;
                    }
                }

                if (isValidRootInsertion) {
                    this.module.closeConstructDraftRecord(root.tokens[indexInRoot]);
                }

                newCode.tokens[replaceIndex] = context.expressionToRight;
                context.expressionToRight.indexInRoot = replaceIndex;
                context.expressionToRight.rootNode = newCode;
                root.tokens[indexInRoot] = newCode;
                root.rebuild(root.getLeftPosition(), 0);
                this.module.editor.executeEdits(initialBoundary, newCode);
                this.module.focus.updateContext({
                    positionToMove: new Position(newCode.lineNumber, newCode.right),
                });

                if (!isValidRootInsertion) {
                    this.module.closeConstructDraftRecord(expr);
                    this.module.openDraftMode(newCode);
                }

                break;
            }

            case EditActionType.InsertEmptyList: {
                this.insertExpression(context, new ListLiteralExpression());

                break;
            }

            case EditActionType.InsertEmptyListItem: {
                if (action.data.toRight) {
                    const code = [new NonEditableTkn(", "), new TypedEmptyExpr([DataType.Any])];
                    this.module.insertAfterIndex(context.tokenToRight, context.tokenToRight.indexInRoot, code);
                    this.module.editor.insertAtCurPos(code);
                    this.module.focus.updateContext({ tokenToSelect: code[1] });
                } else if (action.data.toLeft) {
                    const code = [new TypedEmptyExpr([DataType.Any]), new NonEditableTkn(", ")];
                    this.module.insertAfterIndex(context.tokenToLeft, context.tokenToLeft.indexInRoot + 1, code);
                    this.module.editor.insertAtCurPos(code);
                    this.module.focus.updateContext({ tokenToSelect: code[0] });
                }

                break;
            }

            case EditActionType.DeleteListItem: {
                if (action.data.toRight) {
                    const items = this.module.removeItems(context.token.rootNode, context.token.indexInRoot, 2);
                    this.module.editor.executeEdits(this.getCascadedBoundary(items), null, "");
                } else if (action.data.toLeft) {
                    const items = this.module.removeItems(context.token.rootNode, context.token.indexInRoot - 1, 2);
                    this.module.editor.executeEdits(this.getCascadedBoundary(items), null, "");
                }

                break;
            }

            case EditActionType.SelectClosestTokenAbove: {
                this.module.focus.navigateUp();

                break;
            }

            case EditActionType.SelectClosestTokenBelow: {
                this.module.focus.navigateDown();

                break;
            }

            case EditActionType.MoveCursorLeft:
                preventDefaultEvent = false;

                break;

            case EditActionType.MoveCursorRight:
                preventDefaultEvent = false;

                break;

            case EditActionType.SelectLeft:
                preventDefaultEvent = false;
                break;

            case EditActionType.SelectRight:
                preventDefaultEvent = false;
                break;

            case EditActionType.SelectToStart:
                preventDefaultEvent = false;
                break;

            case EditActionType.SelectToEnd:
                preventDefaultEvent = false;
                break;

            case EditActionType.Copy:
                preventDefaultEvent = false;
                break;

            case EditActionType.InsertLiteral: {
                this.insertExpression(context, new LiteralValExpr(action.data?.literalType, action.data?.initialValue));

                break;
            }
            /*
            case EditActionType.DisplayGreaterThanSuggestion:
                if (this.module.isAbleToInsertComparator(context)) {
                    this.module.menuController.buildSingleLevelMenu(
                        [ConstructKeys.GreaterThan, ConstructKeys.GreaterThanOrEqual],
                        Util.getInstance(this.module).constructActions,
                        {
                            left: selection.startColumn * this.module.editor.computeCharWidth(),
                            top: selection.startLineNumber * this.module.editor.computeCharHeight(),
                        }
                    );
                }

                break;

            case EditActionType.DisplayLessThanSuggestion:
                if (this.module.isAbleToInsertComparator(context)) {
                    this.module.menuController.buildSingleLevelMenu(
                        [ConstructKeys.LessThan, ConstructKeys.LessThanOrEqual],
                        Util.getInstance(this.module).constructActions,
                        {
                            left: selection.startColumn * this.module.editor.computeCharWidth(),
                            top: selection.startLineNumber * this.module.editor.computeCharHeight(),
                        }
                    );
                }

                break;

            case EditActionType.DisplayEqualsSuggestion:
                suggestions = [ConstructKeys.Equals, ConstructKeys.NotEquals, ConstructKeys.VariableAssignment];
                // suggestions = this.module.getValidInsertsFromSet(focusedNode, suggestions);

                this.module.menuController.buildSingleLevelMenu(
                    suggestions,
                    Util.getInstance(this.module).constructActions,
                    {
                        left: selection.startColumn * this.module.editor.computeCharWidth(),
                        top: selection.startLineNumber * this.module.editor.computeCharHeight(),
                    }
                );

                break;*/

            case EditActionType.OpenValidInsertMenu:
                this.openAutocompleteMenu(this.module.actionFilter.getAllValidInsertsList());

                break;

            //TODO: Remove later
            case EditActionType.OpenValidInsertMenuSingleLevel:
                if (!this.module.menuController.isMenuOpen()) {
                    //TODO: Make this work with ActionFilter
                    //const suggestions = this.module.getAllValidInsertsList(focusedNode);
                    //this.module.menuController.buildSingleLevelConstructCategoryMenu(suggestions);
                } else this.module.menuController.removeMenus();

                break;

            case EditActionType.SelectMenuSuggestionAbove:
                this.module.menuController.focusOptionAbove();

                break;

            case EditActionType.SelectMenuSuggestionBelow:
                this.module.menuController.focusOptionBelow();

                break;

            case EditActionType.SelectMenuSuggestion:
                this.module.menuController.selectFocusedOption();

                break;

            case EditActionType.CloseValidInsertMenu:
                this.module.menuController.removeMenus();

                break;

            case EditActionType.OpenSubMenu:
                this.module.menuController.openSubMenu();

                break;

            case EditActionType.CloseSubMenu:
                this.module.menuController.closeSubMenu();

                break;

            case EditActionType.CloseDraftMode:
                this.deleteCode(action.data.codeNode);

                break;

            case EditActionType.None: {
                preventDefaultEvent = true;

                break;
            }
        }

        this.module.editor.monaco.focus();

        return preventDefaultEvent;
    }

    createVarReference(buttonId: string): VariableReferenceExpr {
        const identifier = document.getElementById(buttonId).innerText;
        const dataType = this.module.variableController.getVariableTypeNearLine(
            this.module.focus.getFocusedStatement().scope ??
                (
                    this.module.focus.getStatementAtLineNumber(this.module.editor.monaco.getPosition().lineNumber)
                        .rootNode as Statement | Module
                ).scope,
            this.module.editor.monaco.getPosition().lineNumber,
            identifier
        );

        return new VariableReferenceExpr(identifier, dataType, buttonId);
    }

    insertVariableReference(buttonId: string, providedContext?: Context) {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        if (this.module.validator.onBeginningOfLine(context)) {
            this.insertStatement(context, new VarOperationStmt(this.createVarReference(buttonId)));
        } else if (this.module.validator.atEmptyExpressionHole(context)) {
            this.insertExpression(context, this.createVarReference(buttonId));
        }
    }

    private insertExpression(context: Context, code: Expression) {
        // type checks -- different handling based on type of code construct
        // focusedNode.returns != code.returns would work, but we need more context to get the right error message
        if (context.token instanceof TypedEmptyExpr) {
            const insertionType = context.token.rootNode.typeValidateInsertionIntoHole(code, context.token);

            if (insertionType != InsertionType.Invalid) {
                code.performPreInsertionUpdates(context.token);

                if (context.token.rootNode instanceof Statement) {
                    context.token.rootNode.onInsertInto(code);
                }

                if (context.token.notification && context.selected) {
                    this.module.notificationSystem.removeNotificationFromConstruct(context.token);
                }

                // replaces expression with the newly inserted expression
                const expr = code as Expression;

                this.module.replaceFocusedExpression(expr);

                const range = new Range(
                    context.position.lineNumber,
                    context.token.left,
                    context.position.lineNumber,
                    context.token.right
                );

                this.module.editor.executeEdits(range, expr);

                //TODO: This should probably run only if the insert above was successful, we cannot assume that it was
                if (!context.token.notification) {
                    const newContext = code.getInitialFocus();
                    this.module.focus.updateContext(newContext);
                }
            }

            if (insertionType == InsertionType.DraftMode) this.module.openDraftMode(code);
        }
    }

    private openAutocompleteMenu(inserts: EditCodeAction[]) {
        if (!this.module.menuController.isMenuOpen()) {
            inserts = inserts.filter((insert) => insert.insertionType !== InsertionType.Invalid);
            this.module.menuController.buildSingleLevelMenu(inserts);
        } else this.module.menuController.removeMenus();
    }

    private insertStatement(context: Context, statement: Statement) {
        const root = context.lineStatement.rootNode as Statement | Module;

        replaceInBody(root, context.lineStatement.indexInRoot, statement);

        if (root instanceof Statement) root.notify(CallbackType.replace);

        var range = new Range(
            context.lineStatement.lineNumber,
            statement.left,
            context.lineStatement.lineNumber,
            statement.right
        );

        if (context.lineStatement.notification && context.selected) {
            this.module.notificationSystem.removeNotificationFromConstruct(context.lineStatement);
        }

        this.module.editor.executeEdits(range, statement);
        this.module.focus.updateContext(statement.getInitialFocus());
    }

    private replaceWithBinaryOp(op: BinaryOperator, expr: Expression, { toLeft = false, toRight = false }) {
        const initialBoundary = this.getBoundaries(expr);
        const root = expr.rootNode as Statement;
        const index = expr.indexInRoot;

        const newCode = new BinaryOperatorExpr(
            op,
            expr.returns, // is not that important, will be replaced in the constructor based on the operator.
            root,
            expr.indexInRoot
        );

        const curOperand = toLeft ? newCode.getLeftOperand() : newCode.getRightOperand();
        const otherOperand = toLeft ? newCode.getRightOperand() : newCode.getLeftOperand();
        const insertionType = newCode.typeValidateInsertionIntoHole(expr, curOperand as TypedEmptyExpr);

        /**
         * Special cases
         *
         * if (--- + (--- + ---)|): --> attempting to insert a comparator or binary boolean operation should fail
         */
        if (insertionType === InsertionType.Valid) {
            const replacementType = expr.canReplaceWithConstruct(newCode);

            // this can never go into draft mode
            if (replacementType !== InsertionType.Invalid) {
                this.module.closeConstructDraftRecord(root.tokens[index]);

                if (toLeft) newCode.replaceLeftOperand(expr);
                else newCode.replaceRightOperand(expr);

                expr.indexInRoot = curOperand.indexInRoot;
                expr.rootNode = newCode;

                root.tokens[index] = newCode;
                root.rebuild(root.getLeftPosition(), 0);

                this.module.editor.executeEdits(initialBoundary, newCode);
                this.module.focus.updateContext({
                    tokenToSelect: newCode.tokens[otherOperand.indexInRoot],
                });

                if (replacementType !== InsertionType.DraftMode) {
                    this.module.closeConstructDraftRecord(expr);
                } else {
                    this.module.openDraftMode(newCode);
                }
            }
        }
    }

    private getCascadedBoundary(codes: Array<CodeConstruct>): Range {
        if (codes.length > 1) {
            const lineNumber = codes[0].getLineNumber();

            return new Range(lineNumber, codes[0].left, lineNumber, codes[codes.length - 1].right);
        } else return this.getBoundaries(codes[0]);
    }

    private getBoundaries(code: CodeConstruct, { selectIndent = false } = {}): Range {
        const lineNumber = code.getLineNumber();

        if (code instanceof Statement && code.hasBody()) {
            const stmtStack = new Array<Statement>();
            stmtStack.unshift(...code.body);
            let endLineNumber = 0;
            let endColumn = 0;

            while (stmtStack.length > 0) {
                const curStmt = stmtStack.pop();

                if (curStmt instanceof Statement && curStmt.hasBody()) stmtStack.unshift(...curStmt.body);

                if (endLineNumber < curStmt.lineNumber) {
                    endLineNumber = curStmt.lineNumber;
                    endColumn = curStmt.right;
                }
            }

            return new Range(lineNumber, code.left, endLineNumber, endColumn);
        } else if (code instanceof Statement || code instanceof Token) {
            if (selectIndent) {
                return new Range(lineNumber, code.left - TAB_SPACES, lineNumber, code.right);
            } else return new Range(lineNumber, code.left, lineNumber, code.right);
        }
    }

    private deleteModifier(mod: Modifier, { deleting = false } = {}) {
        // TODO: this will be a prototype version of the code. needs to be cleaned and iterated on ->
        // e.g. merge the operations for VarOperationStmt and ValueOperationExpr

        // TODO: if deleting, should not move cursor
        const removeRange = this.getBoundaries(mod);
        const rootOfExprToLeft = mod.rootNode;

        rootOfExprToLeft.tokens.splice(mod.indexInRoot, 1);
        this.module.recursiveNotify(mod, CallbackType.delete);

        this.module.closeConstructDraftRecord(rootOfExprToLeft);

        let built = false;
        let positionToMove: Position;

        if (rootOfExprToLeft.tokens.length == 1) {
            // only a val or var-ref is remaining:
            if (rootOfExprToLeft instanceof ValueOperationExpr) {
                rootOfExprToLeft.updateReturnType();

                let replacementType = rootOfExprToLeft.rootNode.checkInsertionAtHole(
                    rootOfExprToLeft.indexInRoot,
                    rootOfExprToLeft.returns
                );

                if (replacementType == InsertionType.DraftMode) this.module.openDraftMode(rootOfExprToLeft);

                const value = rootOfExprToLeft.tokens[0];
                rootOfExprToLeft.rootNode.tokens[rootOfExprToLeft.indexInRoot] = value;
                value.rootNode = rootOfExprToLeft.rootNode;
                value.indexInRoot = rootOfExprToLeft.indexInRoot;

                rootOfExprToLeft.rootNode.rebuild(rootOfExprToLeft.rootNode.getLeftPosition(), 0);
                positionToMove = new Position(value.getLineNumber(), value.right);
                built = true;
            }
        }

        if (!built) {
            rootOfExprToLeft.rebuild(rootOfExprToLeft.getLeftPosition(), 0);
            positionToMove = new Position(rootOfExprToLeft.getLineNumber(), rootOfExprToLeft.right);
        }

        this.module.editor.executeEdits(removeRange, null, "");
        if (!deleting) {
            this.module.focus.updateContext({
                positionToMove,
            });
        }
    }

    private deleteCode(code: CodeConstruct, { statement = false, replaceType = null } = {}) {
        const replacementRange = this.getBoundaries(code);
        let replacement: CodeConstruct;

        if (statement) replacement = this.module.removeStatement(code as Statement);
        else replacement = this.module.removeItem(code, { replaceType });

        this.module.editor.executeEdits(replacementRange, replacement);
        this.module.focus.updateContext({ tokenToSelect: replacement });
    }

    private validateIdentifier(context: Context, identifierText: string) {
        let focusedNode = null;

        if (context.token && context.selected && context.token instanceof IdentifierTkn) {
            focusedNode = context.token;
        } else if (context.tokenToLeft && context.tokenToLeft instanceof IdentifierTkn) {
            focusedNode = context.tokenToLeft;
        } else if (context.tokenToRight && context.tokenToRight instanceof IdentifierTkn) {
            focusedNode = context.tokenToRight;
        }

        if (
            focusedNode instanceof IdentifierTkn ||
            context.tokenToLeft instanceof IdentifierTkn ||
            context.tokenToRight instanceof IdentifierTkn
        ) {
            if (Object.keys(PythonKeywords).indexOf(identifierText) > -1) {
                this.module.notificationSystem.addPopUpNotification(
                    focusedNode,
                    { identifier: identifierText },
                    ErrorMessage.identifierIsKeyword
                );
            } else if (Object.keys(BuiltInFunctions).indexOf(identifierText) > -1) {
                this.module.notificationSystem.addPopUpNotification(
                    focusedNode,
                    { identifier: identifierText },
                    ErrorMessage.identifierIsBuiltInFunc
                );
            }
        }
    }
}
