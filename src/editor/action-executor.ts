import * as monaco from "monaco-editor";
import * as keywords from "../syntax-tree/keywords";
import { Context } from "./focus";
import { ConstructKeys, Util } from "../utilities/util";
import { EditAction, EditActionType } from "./event-router";
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
} from "../syntax-tree/ast";
import { Cursor } from "./cursor";

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

            case EditActionType.InsertOperator: {
                if (action.data.toRight) {
                    const code = [new NonEditableTkn(` ${action.data.operator} `), new TypedEmptyExpr([DataType.Any])];
                    this.module.insertAfterIndex(
                        context.expressionToLeft,
                        context.expressionToLeft.indexInRoot + 1,
                        code
                    );
                    this.module.editor.insertAtCurPos(code);
                    this.module.focus.updateContext({ tokenToSelect: code[1] });
                } else if (action.data.toLeft) {
                    const code = [new TypedEmptyExpr([DataType.Any]), new NonEditableTkn(` ${action.data.operator} `)];
                    this.module.insertAfterIndex(
                        context.expressionToRight,
                        context.expressionToRight.indexInRoot,
                        code
                    );
                    this.module.editor.insertAtCurPos(code);
                    this.module.focus.updateContext({ tokenToSelect: code[0] });
                }

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
                if (action.data.literalType == DataType.Number) {
                    this.module.insert(new LiteralValExpr(DataType.Number, pressedKey));
                } else if (action.data.literalType == DataType.String) {
                    this.module.insert(new LiteralValExpr(DataType.String, ""));
                } else if (action.data.literalType == DataType.Boolean) {
                    this.module.insert(new LiteralValExpr(DataType.Boolean, pressedKey === "t" ? "True" : "False"));
                }

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

                //TODO: This code should really be inside of some top level function like the example below, otherwise the client code has to know that you need to call
                //these different methods to properly remove something since removeItem will only remove from AST.

                /**
                 * Ex.
                 * 
                 * function removeCodeElement(code: CodeConstruct){
                 *   const replacementRange = this.getBoundaries(action.data.codeNode);
                 *   const replacement = this.module.removeItem(action.data.codeNode);
                 * 
                 *   this.module.editor.executeEdits(replacementRange, replacement);
                 *   this.module.focus.updateContext({ tokenToSelect: replacement });
                 * }
                 */
                const replacementRange = this.getBoundaries(action.data.codeNode);
                const replacement = this.module.removeItem(action.data.codeNode);

                this.module.editor.executeEdits(replacementRange, replacement);
                this.module.focus.updateContext({ tokenToSelect: replacement });
                
                break;

            case EditActionType.None: {
                preventDefaultEvent = true;

                break;
            }
        }

        return preventDefaultEvent;
    }

    private getBoundaries(code: CodeConstruct): monaco.Range {
        const lineNumber = code.getLineNumber();

        if (code instanceof Expression || code instanceof Token) {
            return new monaco.Range(lineNumber, code.left, lineNumber, code.right);
        } else if (code instanceof Statement && code.hasBody()) {
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
        }
    }

    private deleteCode(code: CodeConstruct, { statement = false } = {}) {
        const replacementRange = this.getBoundaries(code);
        let replacement: CodeConstruct;

        if (statement) replacement = this.module.removeStatement(code as Statement);
        else replacement = this.module.removeItem(code);

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
            const notifPos = {
                left: focusedNode.getLeftPosition().column * this.module.editor.computeCharWidth(),
                top: focusedNode.getLeftPosition().lineNumber * this.module.editor.computeCharHeight(),
            };

            if (Object.keys(keywords.PythonKeywords).indexOf(identifierText) > -1) {
                this.module.notificationSystem.addPopUpNotification(
                    { identifier: identifierText },
                    notifPos,
                    ErrorMessage.identifierIsKeyword
                );
            } else if (Object.keys(keywords.BuiltInFunctions).indexOf(identifierText) > -1) {
                this.module.notificationSystem.addPopUpNotification(
                    { identifier: identifierText },
                    notifPos,
                    ErrorMessage.identifierIsBuiltInFunc
                );
            }
        }
    }
}
