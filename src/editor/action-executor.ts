import { Context } from "./focus";
import * as monaco from "monaco-editor";
import { EditActionType } from "./enums";
import { EditAction } from "./event-router";
import * as keywords from "../syntax-tree/keywords";
import { ConstructKeys, Util } from "../utilities/util";
import { ErrorMessage } from "../notification-system/error-msg-generator";
import {
    Module,
    DataType,
    IdentifierTkn,
    LiteralValExpr,
    NonEditableTkn,
    TypedEmptyExpr,
    ListLiteralExpression,
    CodeConstruct,
    Statement,
    Expression,
    Token,
    BinaryOperatorExpr,
    InsertionType,
    IfStatement,
    BinaryOperator,
} from "../syntax-tree/ast";

export class ActionExecutor {
    module: Module;

    constructor(module: Module) {
        this.module = module;
    }

    execute(action: EditAction, providedContext?: Context, pressedKey?: string): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();
        const selection = this.module.editor.monaco.getSelection();

        let focusedNode = context.token && context.selected ? context.token : context.lineStatement;
        let suggestions = [];
        let preventDefaultEvent = true;

        switch (action.type) {
            case EditActionType.InsertExpression: {
                this.module.insert(action.data?.expression);

                break;
            }

            case EditActionType.InsertStatement: {
                this.module.insert(action.data?.statement);

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
                this.deleteCode(context.expressionToRight);

                break;
            }

            case EditActionType.DeletePrevToken: {
                this.deleteCode(context.expressionToLeft);

                break;
            }

            case EditActionType.DeleteStatement: {
                this.deleteCode(context.lineStatement, { statement: true });

                break;
            }

            case EditActionType.DeleteCurLine: {
                this.module.deleteLine(context.lineStatement);
                let range: monaco.Range;

                if (action.data?.pressedBackspace) {
                    const lineAbove = this.module.focus.getStatementAtLineNumber(context.lineStatement.lineNumber - 1);
                    this.module.focus.updateContext({
                        positionToMove: new monaco.Position(lineAbove.lineNumber, lineAbove.right),
                    });
                    range = new monaco.Range(
                        context.lineStatement.lineNumber,
                        context.lineStatement.left,
                        lineAbove.lineNumber,
                        lineAbove.right
                    );
                } else {
                    range = new monaco.Range(
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
                const deleteRange = new monaco.Range(
                    prevLine.lineNumber,
                    prevLine.left,
                    prevLine.lineNumber + 1,
                    prevLine.left
                );
                this.module.deleteLine(prevLine);
                this.module.editor.executeEdits(deleteRange, null, "");

                break;
            }

            case EditActionType.IndentBackwards: {
                this.module.editor.indentRecursively(context.lineStatement, { backward: true });
                this.module.indentBackStatement(context.lineStatement);

                break;
            }

            case EditActionType.IndentForwards: {
                this.module.editor.indentRecursively(context.lineStatement, { backward: false });
                this.module.indentForwardStatement(context.lineStatement);

                break;
            }

            case EditActionType.InsertEmptyLine: {
                this.module.insertEmptyLine();

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
                let newText = "";

                if (token.getEditableText() == "   ") {
                    const curText = "";
                    newText = curText + pressedKey;
                } else {
                    const curText = token.getEditableText().split("");
                    curText.splice(
                        cursorPos.column - token.getLeft(),
                        Math.abs(selectedText.startColumn - selectedText.endColumn),
                        pressedKey
                    );

                    newText = curText.join("");
                }

                this.validateIdentifier(context, newText);

                if (token.setEditedText(newText)) {
                    let editRange = new monaco.Range(
                        cursorPos.lineNumber,
                        cursorPos.column,
                        cursorPos.lineNumber,
                        cursorPos.column
                    );

                    if (selectedText.startColumn != selectedText.endColumn) {
                        editRange = new monaco.Range(
                            cursorPos.lineNumber,
                            selectedText.startColumn,
                            cursorPos.lineNumber,
                            selectedText.endColumn
                        );
                    }

                    this.module.editor.executeEdits(editRange, null, pressedKey);
                }

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
                        this.deleteCode(literalExpr, { replaceType: DataType.Any });

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
                            new monaco.Range(
                                cursorPos.lineNumber,
                                identifier.left,
                                cursorPos.lineNumber,
                                identifier.right
                            ),
                            null,
                            "   "
                        );
                        context.lineStatement.build(context.lineStatement.getLeftPosition());
                        this.module.focus.updateContext({ tokenToSelect: identifier });

                        break;
                    }
                }

                if (token.setEditedText(newText)) {
                    let editRange = new monaco.Range(
                        cursorPos.lineNumber,
                        cursorPos.column,
                        cursorPos.lineNumber,
                        cursorPos.column
                    );

                    if (selectedText.startColumn != selectedText.endColumn) {
                        editRange = new monaco.Range(
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

            case EditActionType.InsertBinaryOperator: {
                if (action.data.toRight) {
                    this.replaceWithBinaryOp(action.data.operator, context.expressionToLeft, { toLeft: true });
                } else if (action.data.toLeft) {
                    this.replaceWithBinaryOp(action.data.operator, context.expressionToRight, { toRight: true });
                } else if (action.data.replace) {
                    this.module.insert(
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
                    positionToMove: new monaco.Position(newCode.lineNumber, newCode.right),
                });

                if (!isValidRootInsertion) {
                    this.module.closeConstructDraftRecord(expr);
                    this.module.openDraftMode(newCode);
                }

                this.module.editor.monaco.focus();

                break;
            }

            case EditActionType.InsertEmptyList: {
                this.module.insert(new ListLiteralExpression());

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
                // Hole.disableEditableHoleHighlights();
                // this.module.focus.highlightTextEditableHole();

                break;

            case EditActionType.MoveCursorRight:
                preventDefaultEvent = false;
                // Hole.disableEditableHoleHighlights();
                // this.module.focus.highlightTextEditableHole();

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
                this.module.insert(new LiteralValExpr(action.data?.literalType, action.data?.initialValue));

                this.module.editor.monaco.focus();

                break;
            }

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
                suggestions = this.module.getValidInsertsFromSet(focusedNode, suggestions);

                this.module.menuController.buildSingleLevelMenu(
                    suggestions,
                    Util.getInstance(this.module).constructActions,
                    {
                        left: selection.startColumn * this.module.editor.computeCharWidth(),
                        top: selection.startLineNumber * this.module.editor.computeCharHeight(),
                    }
                );

                break;

            case EditActionType.OpenValidInsertMenu:
                if (!this.module.menuController.isMenuOpen()) {
                    const validInserts = this.module.getAllValidInsertsList(focusedNode);
                    this.module.menuController.buildAvailableInsertsMenu(
                        validInserts,
                        Util.getInstance(this.module).constructActions,
                        {
                            left: selection.startColumn * this.module.editor.computeCharWidth(),
                            top: selection.startLineNumber * this.module.editor.computeCharHeight(),
                        }
                    );
                } else this.module.menuController.removeMenus();

                break;

            //TODO: Remove later
            case EditActionType.OpenValidInsertMenuSingleLevel:
                if (!this.module.menuController.isMenuOpen()) {
                    const suggestions = this.module.getAllValidInsertsList(focusedNode);
                    this.module.menuController.buildSingleLevelConstructCategoryMenu(suggestions);
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

        return preventDefaultEvent;
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
        const insertionType = this.module.tryInsert(curOperand, expr);

        /**
         * Special cases
         *
         * if (--- + (--- + ---)|): --> attempting to insert a comparator or binary boolean operation should fail
         */
        if (insertionType === InsertionType.Valid) {
            //this ensures that we can actually replace
            const canConvertNewTypeToOldType =
                root instanceof Expression
                    ? Util.getInstance(this.module)
                          .typeConversionMap.get(newCode.returns)
                          .indexOf((root.tokens[index] as Expression).returns) > -1
                    : true;
            const validateRootInsertion =
                (root.typeOfHoles[index].indexOf(newCode.returns) >= 0 || newCode.returns === DataType.Any) &&
                canConvertNewTypeToOldType;

            if (validateRootInsertion) {
                this.module.closeConstructDraftRecord(root.tokens[index]);
            }
            // this can never go into draft mode
            if (toLeft) newCode.replaceLeftOperand(expr);
            else newCode.replaceRightOperand(expr);

            expr.indexInRoot = curOperand.indexInRoot;
            expr.rootNode = newCode;

            this.module.replaceExpression(root, index, newCode);
            this.module.editor.executeEdits(initialBoundary, newCode);
            this.module.focus.updateContext({
                tokenToSelect: newCode.tokens[otherOperand.indexInRoot],
            });

            if (!validateRootInsertion) {
                this.module.closeConstructDraftRecord(expr);
            }

            if (!validateRootInsertion && canConvertNewTypeToOldType) {
                this.module.openDraftMode(newCode);
            }
        } else {
            //Invalid TODO: Add warning if types don't match if 132: => if (123 + ---) > ---:
            //call notifcation
        }
    }

    private getCascadedBoundary(codes: Array<CodeConstruct>): monaco.Range {
        if (codes.length > 1) {
            const lineNumber = codes[0].getLineNumber();

            return new monaco.Range(lineNumber, codes[0].left, lineNumber, codes[codes.length - 1].right);
        } else return this.getBoundaries(codes[0]);
    }

    private getBoundaries(code: CodeConstruct): monaco.Range {
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

            return new monaco.Range(lineNumber, code.left, endLineNumber, endColumn);
        } else if (code instanceof Statement || code instanceof Token) {
            return new monaco.Range(lineNumber, code.left, lineNumber, code.right);
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
            if (Object.keys(keywords.PythonKeywords).indexOf(identifierText) > -1) {
                this.module.notificationSystem.addPopUpNotification(
                    focusedNode,
                    { identifier: identifierText },
                    ErrorMessage.identifierIsKeyword
                );
            } else if (Object.keys(keywords.BuiltInFunctions).indexOf(identifierText) > -1) {
                this.module.notificationSystem.addPopUpNotification(
                    focusedNode,
                    { identifier: identifierText },
                    ErrorMessage.identifierIsBuiltInFunc
                );
            }
        }
    }
}
