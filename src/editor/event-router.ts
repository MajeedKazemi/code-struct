import { Context } from "./focus";
import * as ast from "../syntax-tree/ast";
import { Module } from "../syntax-tree/module";
import { ButtonPress, EditActionType, KeyPress } from "./enums";
import { BinaryOperator, DataType, UnaryOp } from "./../syntax-tree/consts";

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

    getBinaryOperatorFromKey(key: string): BinaryOperator {
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

    routeToolboxEvents(e: ButtonPress, context: Context, data: any) {
        switch (e) {
            case ButtonPress.InsertNewVariableStmt: {
                return new EditAction(EditActionType.InsertStatement, { statement: new ast.VarAssignmentStmt() });
            }

            case ButtonPress.InsertListIndexAssignment: {
                return new EditAction(EditActionType.InsertStatement, {
                    statement: new ast.ListElementAssignment(),
                });
            }

            case ButtonPress.InsertPrintFunctionStmt: {
                return new EditAction(EditActionType.InsertStatement, {
                    statement: new ast.FunctionCallStmt(
                        "print",
                        [new ast.Argument([DataType.Any], "item", false)],
                        DataType.Void
                    ),
                });
            }

            case ButtonPress.InsertRandintExpr: {
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

            case ButtonPress.InsertRangeExpr: {
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

            case ButtonPress.InsertLenExpr: {
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

            case ButtonPress.InsertLiteral:
            case ButtonPress.InsertLiteral:
            case ButtonPress.InsertLiteral:
            case ButtonPress.InsertLiteral: {
                return new EditAction(EditActionType.InsertLiteral, {
                    literalType: data?.literalType,
                    initialValue: data?.initialValue,
                });
            }

            case ButtonPress.InsertBinaryExpr: {
                if (this.module.validator.atRightOfExpression(context)) {
                    return new EditAction(EditActionType.InsertBinaryOperator, {
                        toRight: true,
                        operator: data?.operator,
                    });
                } else if (this.module.validator.atLeftOfExpression(context)) {
                    return new EditAction(EditActionType.InsertBinaryOperator, {
                        toLeft: true,
                        operator: data?.operator,
                    });
                } else if (this.module.validator.atEmptyExpressionHole(context)) {
                    return new EditAction(EditActionType.InsertBinaryOperator, {
                        replace: true,
                        operator: data?.operator,
                    });
                }

                break;
            }

            case ButtonPress.InsertUnaryExpr: {
                if (this.module.validator.atLeftOfExpression(context)) {
                    return new EditAction(EditActionType.InsertUnaryOperator, {
                        wrap: true,
                        operator: data?.operator,
                    });
                } else if (this.module.validator.atEmptyExpressionHole(context)) {
                    return new EditAction(EditActionType.InsertUnaryOperator, {
                        replace: true,
                        operator: data?.operator,
                    });
                }

                break;
            }

            case ButtonPress.InsertWhileStmt: {
                return new EditAction(EditActionType.InsertStatement, {
                    statement: new ast.WhileStatement(),
                });
            }

            case ButtonPress.InsertIfStmt: {
                return new EditAction(EditActionType.InsertStatement, {
                    statement: new ast.IfStatement(),
                });
            }

            case ButtonPress.InsertElifStmt: {
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

            case ButtonPress.InsertElseStmt: {
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

            case ButtonPress.InsertForStmt: {
                return new EditAction(EditActionType.InsertStatement, {
                    statement: new ast.ForStatement(),
                });
            }

            case ButtonPress.InsertForStmt: {
                return new EditAction(EditActionType.InsertStatement, {
                    statement: new ast.ForStatement(),
                });
            }

            case ButtonPress.InsertListLiteral: {
                if (this.module.validator.atLeftOfExpression(context)) {
                    return new EditAction(EditActionType.WrapExpressionWithItem, {
                        expression: new ast.ListLiteralExpression(),
                    });
                } else if (this.module.validator.atEmptyExpressionHole(context)) {
                    return new EditAction(EditActionType.InsertEmptyList);
                }

                break;
            }

            case ButtonPress.InsertCastStrExpr: {
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

            case ButtonPress.InsertListItem: {
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

            case ButtonPress.InsertListIndexAccessor: {
                if (this.module.validator.atRightOfExpression(context)) {
                    // TODO: should also check the type to be a list

                    return new EditAction(EditActionType.InsertExpression, {
                        expression: new ast.MemberCallStmt(DataType.Any),
                    });
                }

                break;
            }

            case ButtonPress.InsertListAppendMethod: {
                if (this.module.validator.atRightOfExpression(context)) {
                    // TODO: should also check the type

                    return new EditAction(EditActionType.InsertExpression, {
                        expression: new ast.MethodCallStmt("append", [
                            new ast.Argument([DataType.Any], "object", false),
                        ]),
                    });
                }

                break;
            }

            case ButtonPress.InsertStringSplitMethod: {
                if (this.module.validator.atRightOfExpression(context)) {
                    // TODO: should also check the type

                    return new EditAction(EditActionType.InsertExpression, {
                        expression: new ast.MethodCallExpr(
                            "split",
                            [new ast.Argument([DataType.String], "sep", false)],
                            DataType.StringList,
                            DataType.String
                        ),
                    });
                }

                break;
            }

            case ButtonPress.InsertStringJoinMethod: {
                if (this.module.validator.atRightOfExpression(context)) {
                    // TODO: should also check the type

                    return new EditAction(EditActionType.InsertExpression, {
                        expression: new ast.MethodCallExpr(
                            "join",
                            [
                                new ast.Argument(
                                    [DataType.AnyList, DataType.StringList, DataType.NumberList, DataType.BooleanList],
                                    "items",
                                    false
                                ),
                            ],
                            DataType.String,
                            DataType.String
                        ),
                    });
                }

                break;
            }

            case ButtonPress.InsertStringReplaceMethod: {
                if (this.module.validator.atRightOfExpression(context)) {
                    // TODO: should also check the type

                    return new EditAction(EditActionType.InsertExpression, {
                        expression: new ast.MethodCallExpr(
                            "replace",
                            [
                                new ast.Argument([DataType.String], "old", false),
                                new ast.Argument([DataType.String], "new", false),
                            ],
                            DataType.String,
                            DataType.String
                        ),
                    });
                }

                break;
            }

            case ButtonPress.InsertStringFindMethod: {
                if (this.module.validator.atRightOfExpression(context)) {
                    // TODO: should also check the type

                    return new EditAction(EditActionType.InsertExpression, {
                        expression: new ast.MethodCallExpr(
                            "find",
                            [new ast.Argument([DataType.String], "item", false)],
                            DataType.Number,
                            DataType.String
                        ),
                    });
                }

                break;
            }
        }

        return new EditAction(EditActionType.None);
    }

    onButtonDown(id: string) {
        switch (id) {
            case "add-var-btn":
                this.pressButton(id, ButtonPress.InsertNewVariableStmt);

                break;

            case "add-list-elem-assign-btn":
                this.pressButton(id, ButtonPress.InsertListIndexAssignment);

                break;

            case "add-print-btn":
                this.pressButton(id, ButtonPress.InsertPrintFunctionStmt);

                break;

            case "add-randint-btn":
                this.pressButton(id, ButtonPress.InsertRandintExpr);

                break;

            case "add-range-btn":
                this.pressButton(id, ButtonPress.InsertRangeExpr);

                break;

            case "add-len-btn":
                this.pressButton(id, ButtonPress.InsertLenExpr);

                break;

            case "add-str-btn":
                this.pressButton(id, ButtonPress.InsertLiteral, {
                    literalType: DataType.String,
                    initialValue: "",
                });

                break;

            case "add-num-btn":
                this.pressButton(id, ButtonPress.InsertLiteral, {
                    literalType: DataType.Number,
                    initialValue: "0",
                });

                break;

            case "add-true-btn":
                this.pressButton(id, ButtonPress.InsertLiteral, {
                    literalType: DataType.Boolean,
                    initialValue: "True",
                });

                break;

            case "add-false-btn":
                this.pressButton(id, ButtonPress.InsertLiteral, {
                    literalType: DataType.Boolean,
                    initialValue: "False",
                });

                break;

            case "add-bin-add-expr-btn":
                this.pressButton(id, ButtonPress.InsertBinaryExpr, { operator: BinaryOperator.Add });

                break;

            case "add-bin-sub-expr-btn":
                this.pressButton(id, ButtonPress.InsertBinaryExpr, { operator: BinaryOperator.Subtract });

                break;

            case "add-bin-mul-expr-btn":
                this.pressButton(id, ButtonPress.InsertBinaryExpr, { operator: BinaryOperator.Multiply });

                break;

            case "add-bin-div-expr-btn":
                this.pressButton(id, ButtonPress.InsertBinaryExpr, { operator: BinaryOperator.Divide });

                break;

            case "add-bin-and-expr-btn":
                this.pressButton(id, ButtonPress.InsertBinaryExpr, { operator: BinaryOperator.And });

                break;

            case "add-bin-or-expr-btn":
                this.pressButton(id, ButtonPress.InsertBinaryExpr, { operator: BinaryOperator.Or });

                break;

            case "add-comp-eq-expr-btn":
                this.pressButton(id, ButtonPress.InsertBinaryExpr, { operator: BinaryOperator.Equal });

                break;

            case "add-comp-neq-expr-btn":
                this.pressButton(id, ButtonPress.InsertBinaryExpr, { operator: BinaryOperator.NotEqual });

                break;

            case "add-comp-lt-expr-btn":
                this.pressButton(id, ButtonPress.InsertBinaryExpr, { operator: BinaryOperator.LessThan });

                break;

            case "add-comp-lte-expr-btn":
                this.pressButton(id, ButtonPress.InsertBinaryExpr, { operator: BinaryOperator.LessThanEqual });

                break;

            case "add-comp-gt-expr-btn":
                this.pressButton(id, ButtonPress.InsertBinaryExpr, { operator: BinaryOperator.GreaterThan });

                break;

            case "add-comp-gte-expr-btn":
                this.pressButton(id, ButtonPress.InsertBinaryExpr, { operator: BinaryOperator.GreaterThanEqual });

                break;

            case "add-unary-not-expr-btn":
                this.pressButton(id, ButtonPress.InsertUnaryExpr, { operator: UnaryOp.Not });

                break;

            case "add-while-expr-btn":
                this.pressButton(id, ButtonPress.InsertWhileStmt);

                break;

            case "add-if-expr-btn":
                this.pressButton(id, ButtonPress.InsertIfStmt);

                break;

            case "add-elif-expr-btn":
                this.pressButton(id, ButtonPress.InsertElifStmt);

                break;

            case "add-else-expr-btn":
                this.pressButton(id, ButtonPress.InsertElseStmt);

                break;

            case "add-for-expr-btn":
                this.pressButton(id, ButtonPress.InsertForStmt);

                break;

            case "add-list-literal-btn":
                this.pressButton(id, ButtonPress.InsertListLiteral);

                break;

            case "add-list-item-btn":
                this.pressButton(id, ButtonPress.InsertListItem);

                break;

            case "add-list-index-btn":
                this.pressButton(id, ButtonPress.InsertListIndexAccessor);

                break;

            case "add-list-append-stmt-btn":
                this.pressButton(id, ButtonPress.InsertListAppendMethod);

                break;

            case "add-split-method-call-btn":
                this.pressButton(id, ButtonPress.InsertStringSplitMethod);

                break;

            case "add-join-method-call-btn":
                this.pressButton(id, ButtonPress.InsertStringJoinMethod);

                break;

            case "add-replace-method-call-btn":
                this.pressButton(id, ButtonPress.InsertStringReplaceMethod);

                break;

            case "add-find-method-call-btn":
                this.pressButton(id, ButtonPress.InsertStringFindMethod);

                break;

            case "add-cast-str-btn":
                this.pressButton(id, ButtonPress.InsertCastStrExpr);
                break;

            default:
        }
    }

    private pressButton(buttonId: string, e: ButtonPress, data?: any) {
        if (!(document.getElementById(buttonId) as HTMLButtonElement).disabled) {
            const context = this.module.focus.getContext();
            this.module.executer.execute(this.routeToolboxEvents(e, context, data), context);
        }
    }
}

export class EditAction {
    type: EditActionType;
    data: any;

    constructor(type: EditActionType, data?: any) {
        this.type = type;
        this.data = data;
    }
}
