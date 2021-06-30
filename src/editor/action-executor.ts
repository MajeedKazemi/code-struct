import * as monaco from "monaco-editor";
import { BinaryOperator, DataType, EmptyExpr, IdentifierTkn, Module, NonEditableTkn } from "../syntax-tree/ast";
import { ConstructKeys, Util } from "../utilities/util";
import { EditAction } from "./event-router";
import { Context } from "./focus";
import * as keywords from "../syntax-tree/keywords";
import { ErrorMessage } from "../notification-system/error-msg-generator";

export class ActionExecutor {
    module: Module;

    constructor(module: Module) {
        this.module = module;
    }

    execute(action: EditAction, providedContext?: Context, pressedKey?: string) : boolean{
        const context = providedContext ? providedContext: this.module.focus.getContext();
        const selection = this.module.editor.monaco.getSelection();

        let focusedNode = context.token && context.selected ? context.token : context.lineStatement;
        let suggestions = [];
        let preventDefaultEvent = true;

        switch (action) {
            case EditAction.InsertEmptyLine: {
                this.module.insertEmptyLine();

                break;
            }

            case EditAction.SelectPrevToken: {
                this.module.focus.navigateLeft();

                break;
            }

            case EditAction.SelectNextToken: {
                this.module.focus.navigateRight();

                break;
            }

            case EditAction.InsertChar: {
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

            case EditAction.DeletePrevChar:
            case EditAction.DeleteNextChar: {
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

                const toDeletePos = action == EditAction.DeleteNextChar ? 0 : 1;

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

            case EditAction.InsertEmptyRightListItem: {
                const code = [new NonEditableTkn(", "), new EmptyExpr()];
                this.module.insertAfterIndex(context.tokenToRight, context.tokenToRight.indexInRoot, code);
                this.module.editor.insertAtCurPos(code);
                this.module.focus.updateContext({ tokenToSelect: code[1] });

                break;
            }

            case EditAction.InsertEmptyLeftListItem: {
                const code = [new EmptyExpr(), new NonEditableTkn(", ")];
                this.module.insertAfterIndex(context.tokenToLeft, context.tokenToLeft.indexInRoot + 1, code);
                this.module.editor.insertAtCurPos(code);
                this.module.focus.updateContext({ tokenToSelect: code[0] });

                break;
            }

            case EditAction.SelectClosestTokenAbove: {
                this.module.focus.navigateUp();

                break;
            }

            case EditAction.SelectClosestTokenBelow: {
                this.module.focus.navigateDown();

                break;
            }

            case EditAction.MoveCursorLeft:
                preventDefaultEvent = false;
                // Hole.disableEditableHoleHighlights();
                // this.module.focus.highlightTextEditableHole();

                break;

            case EditAction.MoveCursorRight:
                preventDefaultEvent = false;
                // Hole.disableEditableHoleHighlights();
                // this.module.focus.highlightTextEditableHole();

                break;

            case EditAction.SelectLeft:
                preventDefaultEvent = false;
                break;

            case EditAction.SelectRight:
                preventDefaultEvent = false;
                break;

            case EditAction.SelectToStart:
                preventDefaultEvent = false;
                break;

            case EditAction.SelectToEnd:
                preventDefaultEvent = false;
                break;

            case EditAction.Copy:
                preventDefaultEvent = false;
                break;

            case EditAction.CompleteAddition:
                this.module.constructCompleter.completeArithmeticConstruct(BinaryOperator.Add);

                break;

            case EditAction.CompleteSubtraction:
                this.module.constructCompleter.completeArithmeticConstruct(BinaryOperator.Subtract);

                break;

            case EditAction.CompleteDivision:
                this.module.constructCompleter.completeArithmeticConstruct(BinaryOperator.Divide);

                break;

            case EditAction.CompleteMultiplication:
                this.module.constructCompleter.completeArithmeticConstruct(BinaryOperator.Multiply);

                break;

            case EditAction.CompleteIntLiteral:
                this.module.constructCompleter.completeLiteralConstruct(DataType.Number, pressedKey);

                break;

            case EditAction.CompleteStringLiteral:
                this.module.constructCompleter.completeLiteralConstruct(DataType.String, "");

                break;

            case EditAction.CompleteBoolLiteral:
                this.module.constructCompleter.completeBoolLiteralConstruct(pressedKey === "t" ? 1 : 0);

                break;

            case EditAction.DisplayGreaterThanSuggestion:
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

            case EditAction.DisplayLessThanSuggestion:
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

            case EditAction.DisplayEqualsSuggestion:
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

            case EditAction.OpenValidInsertMenu:
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
            case EditAction.OpenValidInsertMenuSingleLevel:
                if (!this.module.menuController.isMenuOpen()) {
                    const suggestions = this.module.getAllValidInsertsList(focusedNode);
                    this.module.menuController.buildSingleLevelConstructCategoryMenu(suggestions);
                } else this.module.menuController.removeMenus();

                break;

            case EditAction.SelectMenuSuggestionAbove:
                this.module.menuController.focusOptionAbove();

                break;

            case EditAction.SelectMenuSuggestionBelow:
                this.module.menuController.focusOptionBelow();

                break;

            case EditAction.SelectMenuSuggestion:
                this.module.menuController.selectFocusedOption();

                break;

            case EditAction.CloseValidInsertMenu:
                this.module.menuController.removeMenus();

                break;

            case EditAction.OpenSubMenu:
                this.module.menuController.openSubMenu();

                break;

            case EditAction.CloseSubMenu:
                this.module.menuController.closeSubMenu();

                break;

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
