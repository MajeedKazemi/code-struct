import { Context } from "./focus";
import { EditAction } from "./data-types";
import * as ast from "../syntax-tree/ast";
import { Module } from "../syntax-tree/module";
import { BinaryOperator, DataType } from "./../syntax-tree/consts";
import { InsertActionType, EditActionType, KeyPress, Actions } from "./consts";
import { EditCodeAction } from "./action-filter";

export class EventRouter {
    module: Module;

    constructor(module: Module) {
        this.module = module;
    }

    getKeyAction(e: KeyboardEvent, providedContext?: Context): EditAction {
        const context = providedContext ? providedContext : this.module.focus.getContext();
        const inTextEditMode = this.module.focus.isTextEditable(context);

        switch (e.key) {
            case KeyPress.ArrowUp: {
                if (this.module.menuController.isMenuOpen()) {
                    return new EditAction(EditActionType.SelectMenuSuggestionAbove);
                } else return new EditAction(EditActionType.SelectClosestTokenAbove);
            }

            case KeyPress.ArrowDown: {
                if (this.module.menuController.isMenuOpen()) {
                    return new EditAction(EditActionType.SelectMenuSuggestionBelow);
                } else return new EditAction(EditActionType.SelectClosestTokenBelow);
            }

            case KeyPress.ArrowLeft: {
                if (!inTextEditMode && this.module.menuController.isMenuOpen()) {
                    return new EditAction(EditActionType.CloseSubMenu);
                }

                if (inTextEditMode) {
                    if (this.module.validator.canMoveToPrevTokenAtTextEditable(context)) {
                        return new EditAction(EditActionType.SelectPrevToken);
                    }

                    if (e.shiftKey && e.ctrlKey) return new EditAction(EditActionType.SelectToStart);
                    else if (e.shiftKey) return new EditAction(EditActionType.SelectLeft);
                    else if (e.ctrlKey) return new EditAction(EditActionType.MoveCursorStart);
                    else return new EditAction(EditActionType.MoveCursorLeft);
                } else return new EditAction(EditActionType.SelectPrevToken);
            }

            case KeyPress.ArrowRight: {
                if (!inTextEditMode && this.module.menuController.isMenuOpen()) {
                    return new EditAction(EditActionType.OpenSubMenu);
                }

                if (inTextEditMode) {
                    if (this.module.validator.canMoveToNextTokenAtTextEditable(context)) {
                        return new EditAction(EditActionType.SelectNextToken);
                    }

                    if (e.shiftKey && e.ctrlKey) return new EditAction(EditActionType.SelectToEnd);
                    else if (e.shiftKey) return new EditAction(EditActionType.SelectRight);
                    else if (e.ctrlKey) return new EditAction(EditActionType.MoveCursorEnd);
                    else return new EditAction(EditActionType.MoveCursorRight);
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

            case KeyPress.OpenBracket: {
                if (this.module.validator.canInsertEmptyList(context)) {
                    return new EditAction(EditActionType.InsertEmptyList);
                } else if (this.module.validator.atLeftOfExpression(context)) {
                    return new EditAction(EditActionType.WrapExpressionWithItem, {
                        expression: new ast.ListLiteralExpression(),
                    });
                }

                break;
            }

            case KeyPress.Comma: {
                const toRight = this.module.validator.canAddListItemToRight(context);
                const toLeft = this.module.validator.canAddListItemToLeft(context);

                if (toLeft || toRight) {
                    return new EditAction(EditActionType.InsertEmptyListItem, {
                        toRight,
                        toLeft,
                    });
                } else if (inTextEditMode) return new EditAction(EditActionType.InsertChar);

                break;
            }

            case KeyPress.GreaterThan:
            case KeyPress.LessThan:
            case KeyPress.Equals:
            case KeyPress.ForwardSlash:
            case KeyPress.Plus:
            case KeyPress.Minus:
            case KeyPress.Star: {
                const toRight = this.module.validator.atRightOfExpression(context);
                const toLeft = this.module.validator.atLeftOfExpression(context);
                const replace = this.module.validator.atEmptyExpressionHole(context);

                if (toRight || toLeft || replace) {
                    return new EditAction(EditActionType.InsertBinaryOperator, {
                        operator: this.getBinaryOperatorFromKey(e.key),
                        toRight,
                        toLeft,
                        replace,
                    });
                } else if (inTextEditMode) return new EditAction(EditActionType.InsertChar);
            }

            case KeyPress.Escape: {
                if (inTextEditMode) return new EditAction(EditActionType.InsertChar);
                else if (this.module.menuController.isMenuOpen()) {
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

            //TODO: Remove later
            case KeyPress.P: {
                if (inTextEditMode) return new EditAction(EditActionType.InsertChar);
                if (!inTextEditMode && e.ctrlKey && e.key.length == 1) {
                    return new EditAction(EditActionType.OpenValidInsertMenuSingleLevel);
                }

                break;
            }

            default: {
                if (inTextEditMode) {
                    if (e.key.length == 1) {
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

                        return new EditAction(EditActionType.InsertChar);
                    }
                } else {
                    if (["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].indexOf(e.key) > -1) {
                        return new EditAction(EditActionType.InsertLiteral, {
                            literalType: DataType.Number,
                            initialValue: e.key,
                        });
                    } else if (["t", "f"].indexOf(e.key) > -1) {
                        return new EditAction(EditActionType.InsertLiteral, {
                            literalType: DataType.Boolean,
                            initialValue: e.key === "t" ? "True" : "False",
                        });
                    } else if (['"'].indexOf(e.key) > -1) {
                        return new EditAction(EditActionType.InsertLiteral, {
                            literalType: DataType.String,
                        });
                    }
                }
            }
        }

        return new EditAction(EditActionType.None);
    }

    onKeyDown(e) {
        const context = this.module.focus.getContext();
        const action = this.getKeyAction(e.browserEvent, context);
        const preventDefaultEvent = this.module.executer.execute(action, context, e.browserEvent.key);

        if (preventDefaultEvent) {
            e.preventDefault();
            e.stopPropagation();
        }
    }

    onMouseDown(e) {
        this.module.focus.navigatePos(e.target.position);
    }

    onMouseMove(e) {
        this.module.editor.mousePosMonaco = e.target.position;
    }

    onDidScrollChange(e) {
        this.module.editor.scrollOffsetTop = e.scrollTop;
    }

    routeToolboxEvents(e: EditCodeAction, context: Context): EditAction {
        switch (e.insertActionType) {
            case InsertActionType.InsertNewVariableStmt: {
                return new EditAction(EditActionType.InsertVarAssignStatement, {
                    statement: new ast.VarAssignmentStmt(),
                });
            }

            case InsertActionType.InsertVariableReference: {
                return new EditAction(EditActionType.InsertVariableRef, {
                    buttonId: e.insertData.buttonId,
                });
            }

            case InsertActionType.InsertListIndexAssignment: {
                if (!this.module.validator.isAboveElseStatement()) {
                    return new EditAction(EditActionType.InsertStatement, {
                        statement: new ast.ListElementAssignment(),
                    });
                }

                break;
            }

            case InsertActionType.InsertPrintFunctionStmt: {
                if (!this.module.validator.isAboveElseStatement()) {
                    return new EditAction(EditActionType.InsertStatement, {
                        statement: new ast.FunctionCallStmt(
                            "print",
                            [new ast.Argument([DataType.Any], "item", false)],
                            DataType.Void
                        ),
                    });
                }

                break;
            }

            case InsertActionType.InsertRandintExpr: {
                if (!this.module.validator.isAboveElseStatement()) {
                    return new EditAction(EditActionType.InsertStatement, {
                        statement: new ast.FunctionCallStmt(
                            "randint",
                            [
                                new ast.Argument([DataType.Number], "start", false),
                                new ast.Argument([DataType.Number], "end", false),
                            ],
                            DataType.Number
                        ),
                    });
                }

                break;
            }

            case InsertActionType.InsertRangeExpr: {
                if (!this.module.validator.isAboveElseStatement()) {
                    return new EditAction(EditActionType.InsertStatement, {
                        statement: new ast.FunctionCallStmt(
                            "range",
                            [
                                new ast.Argument([DataType.Number], "start", false),
                                new ast.Argument([DataType.Number], "end", false),
                            ],
                            DataType.NumberList
                        ),
                    });
                }

                break;
            }

            case InsertActionType.InsertLenExpr: {
                const expression = new ast.FunctionCallStmt(
                    "len",
                    [
                        new ast.Argument(
                            [
                                DataType.AnyList,
                                DataType.StringList,
                                DataType.BooleanList,
                                DataType.NumberList,
                                DataType.String,
                            ],
                            "list",
                            false
                        ),
                    ],
                    DataType.Number
                );

                if (this.module.validator.atEmptyExpressionHole(context)) {
                    return new EditAction(EditActionType.InsertExpression, {
                        expression,
                    });
                } else if (this.module.validator.atLeftOfExpression(context)) {
                    return new EditAction(EditActionType.WrapExpressionWithItem, {
                        expression,
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

            case InsertActionType.InsertWhileStmt: {
                if (!this.module.validator.isAboveElseStatement()) {
                    return new EditAction(EditActionType.InsertStatement, {
                        statement: new ast.WhileStatement(),
                    });
                }

                break;
            }

            case InsertActionType.InsertIfStmt: {
                if (!this.module.validator.isAboveElseStatement()) {
                    return new EditAction(EditActionType.InsertStatement, {
                        statement: new ast.IfStatement(),
                    });
                }

                break;
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

            case InsertActionType.InsertForStmt: {
                if (!this.module.validator.isAboveElseStatement()) {
                    return new EditAction(EditActionType.InsertStatement, {
                        statement: new ast.ForStatement(),
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
                const expression = new ast.FunctionCallStmt(
                    "str",
                    [new ast.Argument([DataType.Any], "value", false)],
                    DataType.String
                );

                if (this.module.validator.atLeftOfExpression(context)) {
                    return new EditAction(EditActionType.WrapExpressionWithItem, { expression });
                } else if (this.module.validator.atEmptyExpressionHole(context)) {
                    return new EditAction(EditActionType.InsertExpression, {
                        expression,
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

            case InsertActionType.InsertListIndexAccessor: {
                if (this.module.validator.atRightOfExpression(context)) {
                    // TODO: should also check the type to be a list

                    return new EditAction(EditActionType.InsertExpression, {
                        expression: new ast.MemberCallStmt(DataType.Any),
                    });
                }

                break;
            }

            case InsertActionType.InsertListAppendMethod: {
                if (this.module.validator.atRightOfExpression(context)) {
                    // TODO: should also check the type

                    return new EditAction(EditActionType.InsertDotMethod, {
                        functionName: "append",
                        returns: DataType.Void,
                        args: [new ast.Argument([DataType.Any], "object", false)],
                        exprType: DataType.AnyList,
                    });
                }

                break;
            }

            case InsertActionType.InsertStringSplitMethod: {
                if (this.module.validator.atRightOfExpression(context)) {
                    // TODO: should also check the type

                    return new EditAction(EditActionType.InsertDotMethod, {
                        functionName: "split",
                        returns: DataType.StringList,
                        args: [new ast.Argument([DataType.String], "sep", false)],
                        exprType: DataType.String,
                    });
                }

                break;
            }

            case InsertActionType.InsertStringJoinMethod: {
                if (this.module.validator.atRightOfExpression(context)) {
                    // TODO: should also check the type

                    return new EditAction(EditActionType.InsertDotMethod, {
                        functionName: "join",
                        returns: DataType.String,
                        args: [
                            new ast.Argument(
                                [DataType.AnyList, DataType.StringList, DataType.NumberList, DataType.BooleanList],
                                "items",
                                false
                            ),
                        ],
                        exprType: DataType.String,
                    });
                }

                break;
            }

            case InsertActionType.InsertStringReplaceMethod: {
                if (this.module.validator.atRightOfExpression(context)) {
                    // TODO: should also check the type

                    return new EditAction(EditActionType.InsertDotMethod, {
                        functionName: "replace",
                        returns: DataType.String,
                        args: [
                            new ast.Argument([DataType.String], "old", false),
                            new ast.Argument([DataType.String], "new", false),
                        ],
                        exprType: DataType.String,
                    });
                }

                break;
            }

            case InsertActionType.InsertStringFindMethod: {
                if (this.module.validator.atRightOfExpression(context)) {
                    // TODO: should also check the type

                    return new EditAction(EditActionType.InsertDotMethod, {
                        functionName: "find",
                        returns: DataType.Number,
                        args: [new ast.Argument([DataType.String], "item", false)],
                        exprType: DataType.String,
                    });
                }

                break;
            }
        }

        return new EditAction(EditActionType.None);
    }

    onButtonDown(id: string) {
        const context = this.module.focus.getContext();

        if ((document.getElementById(id) as HTMLButtonElement).disabled) return;

        if (this.module.variableController.isVariableReferenceButton(id)) {
            this.module.executer.execute(
                this.module.eventRouter.routeToolboxEvents(
                    new EditCodeAction(id, "", null, InsertActionType.InsertVariableReference, { buttonId: id }),
                    context
                ),
                context
            );
        } else {
            const action = Actions.instance().actionsMap.get(id);

            if (action) this.module.executer.execute(this.routeToolboxEvents(action, context), context);
        }
    }

    private getBinaryOperatorFromKey(key: string): BinaryOperator {
        switch (key) {
            case KeyPress.GreaterThan:
                return BinaryOperator.GreaterThan;

            case KeyPress.LessThan:
                return BinaryOperator.LessThan;

            case KeyPress.Equals:
                return BinaryOperator.Equal;

            case KeyPress.ForwardSlash:
                return BinaryOperator.Divide;

            case KeyPress.Plus:
                return BinaryOperator.Add;

            case KeyPress.Minus:
                return BinaryOperator.Subtract;

            case KeyPress.Star:
                return BinaryOperator.Multiply;

            default:
                return null;
        }
    }
}
