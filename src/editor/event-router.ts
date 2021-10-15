import { editor, IKeyboardEvent, IScrollEvent, Position } from "monaco-editor";
import * as ast from "../syntax-tree/ast";
import { Module } from "../syntax-tree/module";
import { AutoCompleteType, DataType, IdentifierRegex, InsertionType } from "./../syntax-tree/consts";
import { EditCodeAction } from "./action-filter";
import { Actions, EditActionType, InsertActionType, KeyPress } from "./consts";
import { EditAction } from "./data-types";
import { Context } from "./focus";

export class EventRouter {
    module: Module;
    curPosition: Position;

    constructor(module: Module) {
        this.module = module;
        this.curPosition = module.editor.monaco.getPosition();
    }

    getKeyAction(e: KeyboardEvent, providedContext?: Context): EditAction {
        const context = providedContext ? providedContext : this.module.focus.getContext();
        const inTextEditMode = this.module.focus.isTextEditable(context);
        const contextAutocompleteTkn = context.getAutocompleteToken();
        const inAutocompleteToken = contextAutocompleteTkn != null;

        switch (e.key) {
            case KeyPress.ArrowUp: {
                if (this.module.menuController.isMenuOpen()) {
                    return new EditAction(EditActionType.SelectMenuSuggestionAbove);
                } else {
                    this.executeMatchOnNavigation(contextAutocompleteTkn);

                    return new EditAction(EditActionType.SelectClosestTokenAbove);
                }
            }

            case KeyPress.ArrowDown: {
                if (this.module.menuController.isMenuOpen()) {
                    return new EditAction(EditActionType.SelectMenuSuggestionBelow);
                } else {
                    this.executeMatchOnNavigation(contextAutocompleteTkn);

                    return new EditAction(EditActionType.SelectClosestTokenBelow);
                }
            }

            case KeyPress.ArrowLeft: {
                if (!inTextEditMode && !inAutocompleteToken && this.module.menuController.isMenuOpen()) {
                    return new EditAction(EditActionType.CloseSubMenu);
                } else if (inTextEditMode) {
                    if (this.module.validator.canMoveToPrevTokenAtTextEditable(context)) {
                        return new EditAction(EditActionType.SelectPrevToken);
                    }

                    if (e.shiftKey && e.ctrlKey) return new EditAction(EditActionType.SelectToStart);
                    else if (e.shiftKey) return new EditAction(EditActionType.SelectLeft);
                    else if (e.ctrlKey) return new EditAction(EditActionType.MoveCursorStart);
                    else {
                        this.executeMatchOnNavigation(context.tokenToRight);

                        return new EditAction(EditActionType.MoveCursorLeft);
                    }
                } else return new EditAction(EditActionType.SelectPrevToken);
            }

            case KeyPress.ArrowRight: {
                if (!inTextEditMode && !inAutocompleteToken && this.module.menuController.isMenuOpen()) {
                    return new EditAction(EditActionType.OpenSubMenu);
                } else if (inTextEditMode) {
                    if (this.module.validator.canMoveToNextTokenAtTextEditable(context)) {
                        return new EditAction(EditActionType.SelectNextToken);
                    }

                    if (e.shiftKey && e.ctrlKey) return new EditAction(EditActionType.SelectToEnd);
                    else if (e.shiftKey) return new EditAction(EditActionType.SelectRight);
                    else if (e.ctrlKey) return new EditAction(EditActionType.MoveCursorEnd);
                    else {
                        this.executeMatchOnNavigation(context.tokenToLeft);

                        return new EditAction(EditActionType.MoveCursorRight);
                    }
                } else return new EditAction(EditActionType.SelectNextToken);
            }

            case KeyPress.Home: {
                if (inTextEditMode) {
                    if (e.shiftKey) return new EditAction(EditActionType.SelectToStart);
                    else return new EditAction(EditActionType.MoveCursorStart);
                }

                break;
            }

            case KeyPress.End: {
                if (inTextEditMode) {
                    if (e.shiftKey) return new EditAction(EditActionType.SelectToEnd);
                    else return new EditAction(EditActionType.MoveCursorEnd);
                }

                break;
            }

            case KeyPress.Delete: {
                if (
                    inTextEditMode &&
                    !(context.tokenToRight instanceof ast.NonEditableTkn) &&
                    !context.tokenToRight?.isEmpty
                ) {
                    if (e.ctrlKey) return new EditAction(EditActionType.DeleteToEnd);
                    else return new EditAction(EditActionType.DeleteNextChar);
                } else if (this.module.validator.canDeleteNextStatement(context)) {
                    return new EditAction(EditActionType.DeleteStatement);
                } else if (this.module.validator.canDeleteCurLine(context)) {
                    return new EditAction(EditActionType.DeleteCurLine);
                } else if (this.module.validator.canDeleteNextToken(context)) {
                    return new EditAction(EditActionType.DeleteNextToken);
                } else if (this.module.validator.canDeleteListItemToLeft(context)) {
                    return new EditAction(EditActionType.DeleteListItem, {
                        toLeft: true,
                    });
                } else if (this.module.validator.canDeleteListItemToRight(context)) {
                    return new EditAction(EditActionType.DeleteListItem, {
                        toRight: true,
                    });
                }

                break;
            }

            case KeyPress.Backspace: {
                if (
                    inTextEditMode &&
                    !(context.tokenToLeft instanceof ast.NonEditableTkn) &&
                    !this.module.validator.onBeginningOfLine(context)
                ) {
                    if (e.ctrlKey) return new EditAction(EditActionType.DeleteToStart);
                    else return new EditAction(EditActionType.DeletePrevChar);
                } else if (this.module.validator.canDeletePrevStatement(context)) {
                    return new EditAction(EditActionType.DeleteStatement);
                } else if (this.module.validator.canDeletePrevLine(context)) {
                    return new EditAction(EditActionType.DeletePrevLine);
                } else if (this.module.validator.canDeleteBackMultiEmptyLines(context)) {
                    return new EditAction(EditActionType.DeleteBackMultiLines);
                } else if (this.module.validator.canIndentBackIfStatement(context)) {
                } else if (this.module.validator.canIndentBack(context)) {
                    return new EditAction(EditActionType.IndentBackwards);
                } else if (this.module.validator.canIndentBackIfStatement(context)) {
                    return new EditAction(EditActionType.IndentBackwardsIfStmt);
                } else if (this.module.validator.canDeletePrevToken(context)) {
                    return new EditAction(EditActionType.DeletePrevToken);
                } else if (this.module.validator.canBackspaceCurEmptyLine(context)) {
                    return new EditAction(EditActionType.DeleteCurLine, {
                        pressedBackspace: true,
                    });
                } else if (this.module.validator.canDeleteListItemToLeft(context)) {
                    return new EditAction(EditActionType.DeleteListItem, {
                        toLeft: true,
                    });
                } else if (this.module.validator.canDeleteListItemToRight(context)) {
                    return new EditAction(EditActionType.DeleteListItem, {
                        toRight: true,
                    });
                } else if (this.module.validator.shouldDeleteVarAssignmentOnHole(context)) {
                    return new EditAction(EditActionType.DeleteStatement);
                } else if (this.module.validator.shouldDeleteHole(context)) {
                    return new EditAction(EditActionType.DeleteSelectedModifier);
                }

                break;
            }

            case KeyPress.Tab: {
                if (this.module.validator.canIndentForward(context)) {
                    return new EditAction(EditActionType.IndentForwards);
                } else if (this.module.validator.canIndentForwardIfStatement(context)) {
                    return new EditAction(EditActionType.IndentForwardsIfStmt);
                }

                break;
            }

            case KeyPress.Enter: {
                if (this.module.menuController.isMenuOpen()) return new EditAction(EditActionType.SelectMenuSuggestion);
                else if (this.module.validator.canInsertEmptyLine()) {
                    return new EditAction(EditActionType.InsertEmptyLine);
                }

                break;
            }

            case KeyPress.Escape: {
                if (this.module.menuController.isMenuOpen()) {
                    this.executeMatchOnNavigation(contextAutocompleteTkn);

                    return new EditAction(EditActionType.CloseValidInsertMenu);
                } else {
                    const draftModeNode = this.module.focus.getContainingDraftNode(context);

                    if (draftModeNode) {
                        return new EditAction(EditActionType.CloseDraftMode, {
                            codeNode: draftModeNode,
                        });
                    }
                }

                break;
            }

            case KeyPress.Space: {
                if (inTextEditMode) return new EditAction(EditActionType.InsertChar);
                if (!inTextEditMode && e.ctrlKey && e.key.length == 1) {
                    return new EditAction(EditActionType.OpenValidInsertMenu);
                }

                break;
            }

            default: {
                if (e.key.length == 1) {
                    if (inTextEditMode) {
                        switch (e.key) {
                            case KeyPress.C:
                                if (e.ctrlKey) return new EditAction(EditActionType.Copy);

                                break;

                            case KeyPress.V:
                                if (e.ctrlKey) return new EditAction(EditActionType.Paste);

                                break;

                            case KeyPress.Z:
                                if (e.ctrlKey) return new EditAction(EditActionType.Undo);

                                break;

                            case KeyPress.Y:
                                if (e.ctrlKey) return new EditAction(EditActionType.Redo);

                                break;
                        }

                        if (this.module.validator.canSwitchLeftNumToAutocomplete(e.key)) {
                            return new EditAction(EditActionType.OpenAutocomplete, {
                                autocompleteType: AutoCompleteType.RightOfExpression,
                                firstChar: e.key,
                                validMatches: this.module.actionFilter
                                    .getProcessedInsertionsList()
                                    .filter((item) => item.insertionType != InsertionType.Invalid),
                            });
                        } else if (this.module.validator.canSwitchRightNumToAutocomplete(e.key)) {
                            return new EditAction(EditActionType.OpenAutocomplete, {
                                autocompleteType: AutoCompleteType.LeftOfExpression,
                                firstChar: e.key,
                                validMatches: this.module.actionFilter
                                    .getProcessedInsertionsList()
                                    .filter((item) => item.insertionType != InsertionType.Invalid),
                            });
                        } else return new EditAction(EditActionType.InsertChar);
                    } else if (this.module.validator.atEmptyExpressionHole(context)) {
                        if (["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].indexOf(e.key) > -1) {
                            return new EditAction(EditActionType.InsertLiteral, {
                                literalType: DataType.Number,
                                initialValue: e.key,
                            });
                        } else if (['"'].indexOf(e.key) > -1) {
                            return new EditAction(EditActionType.InsertLiteral, {
                                literalType: DataType.String,
                            });
                        } else {
                            return new EditAction(EditActionType.OpenAutocomplete, {
                                autocompleteType: AutoCompleteType.AtExpressionHole,
                                firstChar: e.key,
                                validMatches: this.module.actionFilter
                                    .getProcessedInsertionsList()
                                    .filter((item) => item.insertionType != InsertionType.Invalid),
                            });
                        }
                    } else if (this.module.validator.onBeginningOfLine(context) && IdentifierRegex.test(e.key)) {
                        return new EditAction(EditActionType.OpenAutocomplete, {
                            autocompleteType: AutoCompleteType.StartOfLine,
                            firstChar: e.key,
                            validatorRegex: IdentifierRegex,
                            validMatches: this.module.actionFilter
                                .getProcessedInsertionsList()
                                .filter((item) => item.insertionType != InsertionType.Invalid),
                        });
                    } else if (this.module.validator.atRightOfExpression(context)) {
                        return new EditAction(EditActionType.OpenAutocomplete, {
                            autocompleteType: AutoCompleteType.RightOfExpression,
                            firstChar: e.key,
                            validMatches: this.module.actionFilter
                                .getProcessedInsertionsList()
                                .filter((item) => item.insertionType != InsertionType.Invalid),
                        });
                    } else if (this.module.validator.atLeftOfExpression(context)) {
                        return new EditAction(EditActionType.OpenAutocomplete, {
                            autocompleteType: AutoCompleteType.LeftOfExpression,
                            firstChar: e.key,
                            validMatches: this.module.actionFilter
                                .getProcessedInsertionsList()
                                .filter((item) => item.insertionType != InsertionType.Invalid),
                        });
                    }
                }
            }
        }

        return new EditAction(EditActionType.None);
    }

    onKeyDown(e: IKeyboardEvent) {
        const context = this.module.focus.getContext();
        const action = this.getKeyAction(e.browserEvent, context);
        const preventDefaultEvent = this.module.executer.execute(action, context, e.browserEvent);

        if (preventDefaultEvent) {
            e.preventDefault();
            e.stopPropagation();
        }
    }

    onCursorPosChange(e: editor.ICursorPositionChangedEvent) {
        if (e.source === "mouse") {
            const context = this.module.focus.getContext(this.curPosition);
            const contextAutocompleteTkn = context.getAutocompleteToken();

            this.executeMatchOnNavigation(contextAutocompleteTkn, context);

            this.module.focus.navigatePos(e.position);
        }

        // this.module.focus.updateCurPosition(e.position);
        this.curPosition = e.position;
    }

    onDidScrollChange(e: IScrollEvent) {
        this.module.editor.scrollOffsetTop = e.scrollTop;
        this.module.menuController.updateFocusedMenuScroll(e.scrollTop);
    }

    onButtonDown(id: string) {
        const context = this.module.focus.getContext();

        if ((document.getElementById(id) as HTMLButtonElement).disabled) return;

        if (this.module.variableController.isVariableReferenceButton(id)) {
            this.module.executer.insertVariableReference(id, context);
        } else {
            const action = Actions.instance().actionsMap.get(id);

            if (action) this.module.executer.execute(this.routeToolboxEvents(action, context), context);
        }
    }

    routeToolboxEvents(e: EditCodeAction, context: Context): EditAction {
        switch (e.insertActionType) {
            case InsertActionType.InsertNewVariableStmt: {
                return new EditAction(EditActionType.InsertVarAssignStatement, {
                    statement: e.getCode(),
                });
            }

            case InsertActionType.InsertElifStmt: {
                const canInsertAtCurIndent = this.module.validator.canInsertElifStmtAtCurIndent(context);
                const canInsertAtPrevIndent = this.module.validator.canInsertElifStmtAtPrevIndent(context);

                // prioritize inserting at current indentation over prev one
                if (canInsertAtCurIndent || canInsertAtPrevIndent) {
                    return new EditAction(EditActionType.InsertElseStatement, {
                        hasCondition: true,
                        outside: canInsertAtCurIndent,
                    });
                }

                break;
            }

            case InsertActionType.InsertElseStmt: {
                const canInsertAtCurIndent = this.module.validator.canInsertElseStmtAtCurIndent(context);
                const canInsertAtPrevIndent = this.module.validator.canInsertElseStmtAtPrevIndent(context);

                // prioritize inserting at current indentation over prev one
                if (canInsertAtCurIndent || canInsertAtPrevIndent) {
                    return new EditAction(EditActionType.InsertElseStatement, {
                        hasCondition: false,
                        outside: canInsertAtCurIndent,
                    });
                }

                break;
            }

            case InsertActionType.InsertImportStmt:
            case InsertActionType.InsertWhileStmt:
            case InsertActionType.InsertIfStmt:
            case InsertActionType.InsertForStmt:
            case InsertActionType.InsertListIndexAssignment:
            case InsertActionType.InsertPrintFunctionStmt: {
                if (!this.module.validator.isAboveElseStatement()) {
                    return new EditAction(EditActionType.InsertStatement, {
                        statement: e.getCode(),
                    });
                }

                break;
            }

            case InsertActionType.InsertRangeExpr:
            case InsertActionType.InsertRandintExpr: {
                return new EditAction(EditActionType.InsertExpression, {
                    expression: e.getCode(),
                });

                break;
            }

            case InsertActionType.InsertListIndexAccessor: {
                return new EditAction(EditActionType.InsertModifier, {
                    modifier: e.getCode(),
                });
            }

            case InsertActionType.InsertAssignmentModifier:
            case InsertActionType.InsertAugmentedAssignmentModifier: {
                return new EditAction(EditActionType.InsertAssignmentModifier, {
                    modifier: e.getCode(),
                });
            }

            case InsertActionType.InsertListAppendMethod:
            case InsertActionType.InsertStringSplitMethod:
            case InsertActionType.InsertStringJoinMethod:
            case InsertActionType.InsertStringReplaceMethod:
            case InsertActionType.InsertStringFindMethod: {
                return new EditAction(EditActionType.InsertModifier, { modifier: e.getCode() });
            }

            case InsertActionType.InsertInputExpr:
            case InsertActionType.InsertLenExpr: {
                if (this.module.validator.atEmptyExpressionHole(context)) {
                    return new EditAction(EditActionType.InsertExpression, {
                        expression: e.getCode(),
                    });
                } else if (this.module.validator.atLeftOfExpression(context)) {
                    return new EditAction(EditActionType.WrapExpressionWithItem, {
                        expression: e.getCode(),
                    });
                }

                break;
            }

            case InsertActionType.InsertLiteral: {
                return new EditAction(EditActionType.InsertLiteral, {
                    literalType: e.insertData?.literalType,
                    initialValue: e.insertData?.initialValue,
                });
            }

            case InsertActionType.InsertBinaryExpr: {
                if (this.module.validator.atRightOfExpression(context)) {
                    return new EditAction(EditActionType.InsertBinaryOperator, {
                        toRight: true,
                        operator: e.insertData?.operator,
                    });
                } else if (this.module.validator.atLeftOfExpression(context)) {
                    return new EditAction(EditActionType.InsertBinaryOperator, {
                        toLeft: true,
                        operator: e.insertData?.operator,
                    });
                } else if (this.module.validator.atEmptyExpressionHole(context)) {
                    return new EditAction(EditActionType.InsertBinaryOperator, {
                        replace: true,
                        operator: e.insertData?.operator,
                    });
                }

                break;
            }

            case InsertActionType.InsertUnaryExpr: {
                if (this.module.validator.atLeftOfExpression(context)) {
                    return new EditAction(EditActionType.InsertUnaryOperator, {
                        wrap: true,
                        operator: e.insertData?.operator,
                    });
                } else if (this.module.validator.atEmptyExpressionHole(context)) {
                    return new EditAction(EditActionType.InsertUnaryOperator, {
                        replace: true,
                        operator: e.insertData?.operator,
                    });
                }

                break;
            }

            case InsertActionType.InsertListLiteral: {
                if (this.module.validator.atLeftOfExpression(context)) {
                    return new EditAction(EditActionType.WrapExpressionWithItem, {
                        expression: new ast.ListLiteralExpression(),
                    });
                } else if (this.module.validator.atEmptyExpressionHole(context)) {
                    return new EditAction(EditActionType.InsertEmptyList);
                }

                break;
            }

            case InsertActionType.InsertCastStrExpr: {
                if (this.module.validator.atLeftOfExpression(context)) {
                    return new EditAction(EditActionType.WrapExpressionWithItem, { expression: e.getCode() });
                } else if (this.module.validator.atEmptyExpressionHole(context)) {
                    return new EditAction(EditActionType.InsertExpression, {
                        expression: e.getCode(),
                    });
                }

                break;
            }

            case InsertActionType.InsertListItem: {
                if (this.module.validator.canAddListItemToRight(context)) {
                    return new EditAction(EditActionType.InsertEmptyListItem, {
                        toRight: true,
                    });
                } else if (this.module.validator.canAddListItemToLeft(context)) {
                    return new EditAction(EditActionType.InsertEmptyListItem, {
                        toLeft: true,
                    });
                }

                this.module.editor.monaco.focus();

                break;
            }

            case InsertActionType.InsertVarOperationStmt: {
                return new EditAction(EditActionType.InsertStatement, {
                    statement: e.getCode(),
                });
            }

            case InsertActionType.InsertValOperationExpr: {
                return new EditAction(EditActionType.InsertExpression, {
                    expression: e.getCode(),
                });
            }
        }

        return new EditAction(EditActionType.None);
    }

    private executeMatchOnNavigation(token: ast.Token, providedContext?: Context) {
        const context = providedContext ?? this.module.focus.getContext();

        if (token && token instanceof ast.AutocompleteTkn) {
            const match = token.isMatch();

            if (match) {
                match.performAction(this.module.executer, this.module.eventRouter, context, {
                    identifier: token.text,
                });
            }
        }
    }
}
