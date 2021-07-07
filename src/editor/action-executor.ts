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
} from "../syntax-tree/ast";

export class ActionExecutor {
    module: Module;

    constructor(module: Module) {
        this.module = module;
    }

    private getBoundaries(code: CodeConstruct): monaco.Range {
        const lineNumber = code.getLineNumber();
        return new monaco.Range(lineNumber, code.left, lineNumber, code.right);
    }

    execute(action: EditAction, providedContext?: Context, pressedKey?: string): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();
        const selection = this.module.editor.monaco.getSelection();

        let focusedNode = context.token && context.selected ? context.token : context.lineStatement;
        let suggestions = [];
        let preventDefaultEvent = true;

        switch (action.type) {
            case EditActionType.DeleteNextToken: {
                const replacementRange = this.getBoundaries(context.expressionToRight);
                const replacement = this.module.removeItem(context.expressionToRight);
                this.module.editor.executeEdits(replacementRange, replacement);
                this.module.focus.updateContext({ tokenToSelect: replacement });

                break;
            }

            case EditActionType.DeletePrevToken: {
                const replacementRange = this.getBoundaries(context.expressionToLeft);
                const replacement = this.module.removeItem(context.expressionToLeft);
                this.module.editor.executeEdits(replacementRange, replacement);
                this.module.focus.updateContext({ tokenToSelect: replacement });

                break;
            }

            case EditActionType.DeleteStatement: {
                const replacementRange = this.getBoundaries(context.lineStatement);
                const replacement = this.module.removeStatement(context.lineStatement);
                this.module.editor.executeEdits(replacementRange, replacement);
                this.module.focus.updateContext({ tokenToSelect: replacement });

                break;
            }

            case EditActionType.DeleteCurLine: {
                this.module.deleteLine(context.lineStatement);
                this.module.editor.executeEdits(
                    new monaco.Range(
                        context.lineStatement.lineNumber,
                        context.lineStatement.left,
                        context.lineStatement.lineNumber + 1,
                        context.lineStatement.left
                    ),
                    null,
                    ""
                );

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
                this.module.editor.executeEdits(
                    new monaco.Range(
                        context.lineStatement.lineNumber,
                        context.lineStatement.left,
                        context.lineStatement.lineNumber,
                        context.lineStatement.left - keywords.TAB_SPACES
                    ),
                    null,
                    ""
                );

                if (context.lineStatement.hasBody()) {
                    for (const stmt of context.lineStatement.body) {
                        this.module.editor.executeEdits(
                            new monaco.Range(
                                stmt.lineNumber,
                                stmt.left,
                                stmt.lineNumber,
                                stmt.left - keywords.TAB_SPACES
                            ),
                            null,
                            ""
                        );
                    }
                }

                this.module.indentBackStatement(context.lineStatement);

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

                // TODO: check if turns back into an empty hole

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

                // TODO: if it is equal to '   ' => just prevent default

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

                // TODO: check if turns back into an empty hole

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
                    this.module.menuController.buildAvailableInsertsMenu(
                        this.module.getAllValidInsertsList(focusedNode),
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

            case EditActionType.None: {
                preventDefaultEvent = true;

                break;
            }
        }

        return preventDefaultEvent;
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
