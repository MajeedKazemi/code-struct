import * as ast from "../syntax-tree/ast";
import { Context } from "./focus";
import { TAB_SPACES } from "../syntax-tree/keywords";
import { TypeSystem } from "../syntax-tree/type-sys";

export enum KeyPress {
    // navigation:
    ArrowLeft = "ArrowLeft",
    ArrowRight = "ArrowRight",
    ArrowUp = "ArrowUp",
    ArrowDown = "ArrowDown",

    Home = "Home",
    End = "End",

    Tab = "Tab",

    // delete:
    Delete = "Delete",
    Backspace = "Backspace",

    // enter:
    Enter = "Enter",

    // for mods:
    V = "v",
    C = "c",
    Z = "z",
    Y = "y",

    //Typing sys
    OpenBracket = "[",
    Comma = ",",
    Plus = "+",
    ForwardSlash = "/",
    Star = "*",
    Minus = "-",
    GreaterThan = ">",
    LessThan = "<",
    Equals = "=",

    Escape = "Escape",
    Space = " ",

    //TODO: Remove later
    P = "p",
}

export enum EditActionType {
    Copy, // TODO: NYI: could use default or navigator.clipboard.writeText()
    Paste, // TODO: NYI: check navigator.clipboard.readText()

    Undo,
    Redo,

    MoveCursorLeft,
    MoveCursorRight,
    MoveCursorStart, // TODO: NYI
    MoveCursorEnd, // TODO: NYI

    DeleteNextChar,
    DeletePrevChar,

    DeleteToEnd,
    DeleteToStart,

    SelectLeft,
    SelectRight,
    SelectToStart, // TODO: NYI
    SelectToEnd, // TODO: NYI

    SelectNextToken,
    SelectPrevToken,
    SelectClosestTokenAbove,
    SelectClosestTokenBelow,

    InsertEmptyLine,
    InsertEmptyList,
    InsertEmptyListItem,

    DeleteNextToken,
    DeletePrevToken,
    DeletePrevLine,
    DeleteCurLine,
    DeleteStatement,

    IndentBackwards,
    IndentForwards,

    InsertChar,

    None,

    //typing actions
    InsertOperator,
    InsertLiteral,

    //displaying suggestion menu
    DisplayGreaterThanSuggestion,
    DisplayLessThanSuggestion,
    DisplayEqualsSuggestion,

    //suggestion management
    SelectMenuSuggestionBelow,
    SelectMenuSuggestionAbove,
    SelectMenuSuggestion,
    CloseValidInsertMenu,
    OpenValidInsertMenu,
    OpenSubMenu,
    CloseSubMenu,

    //TODO: Remove later (for the continuos menu with categories)
    OpenValidInsertMenuSingleLevel,

    CloseDraftMode,

}

export class EditAction {
    type: EditActionType;
    data: any;

    constructor(type: EditActionType, data?: any) {
        this.type = type;
        this.data = data;
    }
}

export class EventRouter {
    module: ast.Module;

    constructor(module: ast.Module) {
        this.module = module;
    }

    getKeyAction(e: KeyboardEvent, providedContext?: Context): EditAction {
        const context = providedContext ? providedContext : this.module.focus.getContext();
        const curPos = this.module.editor.monaco.getPosition();
        const inTextEditMode = this.module.focus.isTextEditable(context);
        const focusedNode = context.token && context.selected ? context.token : context.lineStatement;

        switch (e.key) {
            case KeyPress.ArrowUp:
                if (this.module.menuController.isMenuOpen())
                    return new EditAction(EditActionType.SelectMenuSuggestionAbove);
                else return new EditAction(EditActionType.SelectClosestTokenAbove);

            case KeyPress.ArrowDown:
                if (this.module.menuController.isMenuOpen())
                    return new EditAction(EditActionType.SelectMenuSuggestionBelow);
                else return new EditAction(EditActionType.SelectClosestTokenBelow);

            case KeyPress.ArrowLeft:
                if (!inTextEditMode && this.module.menuController.isMenuOpen())
                    return new EditAction(EditActionType.CloseSubMenu);

                if (inTextEditMode) {
                    // if we're at the beginning of an editable text
                    // or
                    // at selected an empty editable identifier
                    // => navigate to the previous token this.focus.navigateLeft();
                    if (
                        (context.tokenToLeft instanceof ast.IdentifierTkn && context.tokenToRight.isEmpty) ||
                        context.tokenToRight instanceof ast.EditableTextTkn ||
                        context.tokenToRight instanceof ast.IdentifierTkn ||
                        (context.token?.isEmpty && context.selected)
                    ) {
                        return new EditAction(EditActionType.SelectPrevToken);
                    }
                    if (e.shiftKey && e.ctrlKey) return new EditAction(EditActionType.SelectToStart);
                    else if (e.shiftKey) return new EditAction(EditActionType.SelectLeft);
                    else if (e.ctrlKey) return new EditAction(EditActionType.MoveCursorStart);
                    else return new EditAction(EditActionType.MoveCursorLeft);
                } else return new EditAction(EditActionType.SelectPrevToken);

            case KeyPress.ArrowRight:
                if (!inTextEditMode && this.module.menuController.isMenuOpen())
                    return new EditAction(EditActionType.OpenSubMenu);

                if (inTextEditMode) {
                    // if we're at the end of an editable text
                    // or
                    // at selected an empty editable identifier
                    // => navigate to the previous token this.focus.navigateRight();

                    // also if we're right before an editable item and need to select it with this new arrow-right key press.
                    if (
                        ((context.tokenToRight instanceof ast.IdentifierTkn ||
                            context.tokenToRight instanceof ast.EditableTextTkn) &&
                            context.tokenToRight.isEmpty) ||
                        context.tokenToLeft instanceof ast.EditableTextTkn ||
                        context.tokenToLeft instanceof ast.IdentifierTkn ||
                        (context.token?.isEmpty && context.selected)
                    ) {
                        return new EditAction(EditActionType.SelectNextToken);
                    }

                    if (e.shiftKey && e.ctrlKey) return new EditAction(EditActionType.SelectToEnd);
                    else if (e.shiftKey) return new EditAction(EditActionType.SelectRight);
                    else if (e.ctrlKey) return new EditAction(EditActionType.MoveCursorEnd);
                    else return new EditAction(EditActionType.MoveCursorRight);
                } else return new EditAction(EditActionType.SelectNextToken);

            case KeyPress.Home:
                if (inTextEditMode) {
                    if (e.shiftKey) return new EditAction(EditActionType.SelectToStart);
                    else return new EditAction(EditActionType.MoveCursorStart);
                }

                break;

            case KeyPress.End:
                if (inTextEditMode) {
                    if (e.shiftKey) return new EditAction(EditActionType.SelectToEnd);
                    else return new EditAction(EditActionType.MoveCursorEnd);
                }

                break;

            case KeyPress.Delete: {
                if (inTextEditMode && !(context.tokenToRight instanceof ast.NonEditableTkn)) {
                    if (e.ctrlKey) return new EditAction(EditActionType.DeleteToEnd);
                    else return new EditAction(EditActionType.DeleteNextChar);
                } else if (this.module.validator.canDeleteNextStatement(context)) {
                    return new EditAction(EditActionType.DeleteStatement);
                } else if (this.module.validator.canDeleteCurLine(context)) {
                    return new EditAction(EditActionType.DeleteCurLine);
                } else if (this.module.validator.canDeleteNextToken(context)) {
                    return new EditAction(EditActionType.DeleteNextToken);
                }

                break;
            }

            case KeyPress.Backspace: {
                if (inTextEditMode && !(context.tokenToLeft instanceof ast.NonEditableTkn)) {
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
                    return new EditAction(EditActionType.DeleteCurLine, { pressedBackspace: true });
                }

                break;
            }

            case KeyPress.Tab: {
                if (this.module.validator.canIndentForward(context)) {
                    return new EditAction(EditActionType.IndentForwards);
                }

                break;
            }

            case KeyPress.Enter:
                if (this.module.menuController.isMenuOpen()) return new EditAction(EditActionType.SelectMenuSuggestion);

                const curSelection = this.module.editor.monaco.getSelection();
                const curStatement = this.module.focus.getFocusedStatement();
                const parent = curStatement.rootNode;
                let leftPosToCheck = 1;

                if (parent instanceof ast.Statement && parent.body.length > 0) {
                    // is inside the body of another statement
                    leftPosToCheck = parent.left + TAB_SPACES;
                }

                if (curSelection.startColumn == curSelection.endColumn) {
                    if (curPos.column == leftPosToCheck || curPos.column == curStatement.right) {
                        return new EditAction(EditActionType.InsertEmptyLine);
                    }
                }

                break;

            case KeyPress.OpenBracket: {
                if (this.module.validator.canInsertEmptyList(context)) {
                    return new EditAction(EditActionType.InsertEmptyList);
                }

                break;
            }

            case KeyPress.Comma:
                if (this.module.validator.canAddListItemToRight(context)) {
                    return new EditAction(EditActionType.InsertEmptyListItem, { toRight: true });
                } else if (this.module.validator.canAddListItemToLeft(context)) {
                    return new EditAction(EditActionType.InsertEmptyListItem, { toLeft: true });
                } else if (inTextEditMode) return new EditAction(EditActionType.InsertChar);

                break;

            case KeyPress.Plus:
                if (this.module.validator.canAddOperatorToRight(ast.BinaryOperator.Add, context)) {
                    return new EditAction(EditActionType.InsertOperator, {
                        toRight: true,
                        operator: ast.BinaryOperator.Add,
                    });
                } else if (this.module.validator.canAddOperatorToLeft(ast.BinaryOperator.Add, context)) {
                    return new EditAction(EditActionType.InsertOperator, {
                        toLeft: true,
                        operator: ast.BinaryOperator.Add,
                    });
                } else if (inTextEditMode) return new EditAction(EditActionType.InsertChar);

                break;

            case KeyPress.Star:
                if (this.module.validator.canAddOperatorToRight(ast.BinaryOperator.Multiply, context)) {
                    return new EditAction(EditActionType.InsertOperator, {
                        toRight: true,
                        operator: ast.BinaryOperator.Multiply,
                    });
                } else if (this.module.validator.canAddOperatorToLeft(ast.BinaryOperator.Multiply, context)) {
                    return new EditAction(EditActionType.InsertOperator, {
                        toLeft: true,
                        operator: ast.BinaryOperator.Multiply,
                    });
                } else if (inTextEditMode) return new EditAction(EditActionType.InsertChar);

                break;

            case KeyPress.Minus:
                if (this.module.validator.canAddOperatorToRight(ast.BinaryOperator.Subtract, context)) {
                    return new EditAction(EditActionType.InsertOperator, {
                        toRight: true,
                        operator: ast.BinaryOperator.Subtract,
                    });
                } else if (this.module.validator.canAddOperatorToLeft(ast.BinaryOperator.Subtract, context)) {
                    return new EditAction(EditActionType.InsertOperator, {
                        toLeft: true,
                        operator: ast.BinaryOperator.Subtract,
                    });
                } else if (inTextEditMode) return new EditAction(EditActionType.InsertChar);

                break;

            case KeyPress.ForwardSlash:
                if (this.module.validator.canAddOperatorToRight(ast.BinaryOperator.Divide, context)) {
                    return new EditAction(EditActionType.InsertOperator, {
                        toRight: true,
                        operator: ast.BinaryOperator.Divide,
                    });
                } else if (this.module.validator.canAddOperatorToLeft(ast.BinaryOperator.Divide, context)) {
                    return new EditAction(EditActionType.InsertOperator, {
                        toLeft: true,
                        operator: ast.BinaryOperator.Divide,
                    });
                } else if (inTextEditMode) return new EditAction(EditActionType.InsertChar);

                break;

            case KeyPress.GreaterThan:
                if (inTextEditMode) return new EditAction(EditActionType.InsertChar);
                if (!inTextEditMode && e.shiftKey && e.key.length == 1) {
                    return new EditAction(EditActionType.DisplayGreaterThanSuggestion);
                }

                break;

            case KeyPress.LessThan:
                if (inTextEditMode) return new EditAction(EditActionType.InsertChar);
                if (!inTextEditMode && e.shiftKey && e.key.length == 1) {
                    return new EditAction(EditActionType.DisplayLessThanSuggestion);
                }

                break;

            case KeyPress.Escape:
                if (inTextEditMode) return new EditAction(EditActionType.InsertChar);
                else if (this.module.menuController.isMenuOpen()) {
                    return new EditAction(EditActionType.CloseValidInsertMenu);
                }
                else{
                    let node = null;
                    if(context.expressionToLeft?.draftModeEnabled){
                        node = context.expressionToLeft;
                    }
                    else if(context.expressionToRight?.draftModeEnabled){
                        node = context.expressionToRight;
                    }
                    else if(focusedNode instanceof ast.Token && !(focusedNode.rootNode instanceof ast.Module) && focusedNode.rootNode.draftModeEnabled){
                        node = focusedNode.rootNode;
                    }

                    if(node){
                        return new EditAction(EditActionType.CloseDraftMode, {codeNode: node});
                    }
                }
                
                break;

            case KeyPress.Equals:
                if (inTextEditMode) return new EditAction(EditActionType.InsertChar);
                if (!inTextEditMode && e.key.length == 1) return new EditAction(EditActionType.DisplayEqualsSuggestion);

                break;

            case KeyPress.Space:
                if (inTextEditMode) return new EditAction(EditActionType.InsertChar);
                if (!inTextEditMode && e.ctrlKey && e.key.length == 1) {
                    return new EditAction(EditActionType.OpenValidInsertMenu);
                }

                break;

            //TODO: Remove later
            case KeyPress.P:
                if (inTextEditMode) return new EditAction(EditActionType.InsertChar);
                if (!inTextEditMode && e.ctrlKey && e.key.length == 1) {
                    return new EditAction(EditActionType.OpenValidInsertMenuSingleLevel);
                }

                break;

            default:
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
                        return new EditAction(EditActionType.InsertLiteral, { literalType: ast.DataType.Number });
                    } else if (["t", "f"].indexOf(e.key) > -1) {
                        return new EditAction(EditActionType.InsertLiteral, { literalType: ast.DataType.Boolean });
                    } else if (['"'].indexOf(e.key) > -1) {
                        return new EditAction(EditActionType.InsertLiteral, { literalType: ast.DataType.String });
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

    onButtonDown(id: string) {
        const context = this.module.focus.getContext();

        switch (id) {
            case "add-var-btn":
                this.pressButton(
                    id,
                    (() => {
                        this.module.insert(new ast.VarAssignmentStmt());
                    }).bind(this)
                );

                break;

            case "add-print-btn":
                this.pressButton(
                    id,
                    (() => {
                        this.module.insert(
                            new ast.FunctionCallStmt(
                                "print",
                                [new ast.Argument([ast.DataType.Any], "item", false)],
                                ast.DataType.Void
                            )
                        );
                    }).bind(this)
                );

                break;

            case "add-randint-btn":
                this.pressButton(
                    id,
                    (() => {
                        this.module.insert(
                            new ast.FunctionCallStmt(
                                "randint",
                                [
                                    new ast.Argument([ast.DataType.Number], "start", false),
                                    new ast.Argument([ast.DataType.Number], "end", false),
                                ],
                                ast.DataType.Number
                            )
                        );
                    }).bind(this)
                );

                break;

            case "add-range-btn":
                this.pressButton(
                    id,
                    (() => {
                        this.module.insert(
                            new ast.FunctionCallStmt(
                                "range",
                                [
                                    new ast.Argument([ast.DataType.Number], "start", false),
                                    new ast.Argument([ast.DataType.Number], "end", false),
                                ],
                                ast.DataType.NumberList
                            )
                        );
                    }).bind(this)
                );

                break;

            case "add-len-btn":
                this.pressButton(
                    id,
                    (() => {
                        this.module.insert(
                            new ast.FunctionCallStmt(
                                "len",
                                [
                                    new ast.Argument(
                                        [
                                            ast.DataType.AnyList,
                                            ast.DataType.StringList,
                                            ast.DataType.BooleanList,
                                            ast.DataType.NumberList,
                                            ast.DataType.String,
                                        ],
                                        "list",
                                        false
                                    ),
                                ],
                                ast.DataType.Number
                            )
                        );
                    }).bind(this)
                );

                break;

            case "add-str-btn":
                this.pressButton(
                    id,
                    (() => {
                        this.module.insert(new ast.LiteralValExpr(ast.DataType.String));
                    }).bind(this)
                );

                break;

            case "add-num-btn":
                this.pressButton(
                    id,
                    (() => {
                        this.module.insert(new ast.LiteralValExpr(ast.DataType.Number, "0"));
                    }).bind(this)
                );

                break;

            case "add-true-btn":
                this.pressButton(
                    id,
                    (() => {
                        this.module.insert(new ast.LiteralValExpr(ast.DataType.Boolean, "True"));
                    }).bind(this)
                );

                break;

            case "add-false-btn":
                this.pressButton(
                    id,
                    (() => {
                        this.module.insert(new ast.LiteralValExpr(ast.DataType.Boolean, "False"));
                    }).bind(this)
                );

                break;

            case "add-bin-add-expr-btn":
                this.pressButton(
                    id,
                    (() => {
                        this.module.insert(new ast.BinaryOperatorExpr(ast.BinaryOperator.Add, ast.DataType.Any));
                    }).bind(this)
                );

                break;

            case "add-bin-sub-expr-btn":
                this.pressButton(
                    id,
                    (() => {
                        this.module.insert(new ast.BinaryOperatorExpr(ast.BinaryOperator.Subtract, ast.DataType.Any));
                    }).bind(this)
                );

                break;

            case "add-bin-mul-expr-btn":
                this.pressButton(
                    id,
                    (() => {
                        this.module.insert(new ast.BinaryOperatorExpr(ast.BinaryOperator.Multiply, ast.DataType.Any));
                    }).bind(this)
                );

                break;

            case "add-bin-div-expr-btn":
                this.pressButton(
                    id,
                    (() => {
                        this.module.insert(new ast.BinaryOperatorExpr(ast.BinaryOperator.Divide, ast.DataType.Any));
                    }).bind(this)
                );

                break;

            case "add-bin-and-expr-btn":
                this.pressButton(
                    id,
                    (() => {
                        this.module.insert(new ast.BinaryBoolOperatorExpr(ast.BoolOperator.And));
                    }).bind(this)
                );

                break;

            case "add-bin-or-expr-btn":
                this.pressButton(
                    id,
                    (() => {
                        this.module.insert(new ast.BinaryBoolOperatorExpr(ast.BoolOperator.Or));
                    }).bind(this)
                );

                break;

            case "add-unary-not-expr-btn":
                this.pressButton(
                    id,
                    (() => {
                        this.module.insert(
                            new ast.UnaryOperatorExpr(ast.UnaryOp.Not, ast.DataType.Boolean, ast.DataType.Boolean)
                        );
                    }).bind(this)
                );

                break;

            case "add-comp-eq-expr-btn":
                this.pressButton(
                    id,
                    (() => {
                        this.module.insert(new ast.ComparatorExpr(ast.ComparatorOp.Equal));
                    }).bind(this)
                );

                break;

            case "add-comp-neq-expr-btn":
                this.pressButton(
                    id,
                    (() => {
                        this.module.insert(new ast.ComparatorExpr(ast.ComparatorOp.NotEqual));
                    }).bind(this)
                );

                break;

            case "add-comp-lt-expr-btn":
                this.pressButton(
                    id,
                    (() => {
                        this.module.insert(new ast.ComparatorExpr(ast.ComparatorOp.LessThan));
                    }).bind(this)
                );

                break;

            case "add-comp-lte-expr-btn":
                this.pressButton(
                    id,
                    (() => {
                        this.module.insert(new ast.ComparatorExpr(ast.ComparatorOp.LessThanEqual));
                    }).bind(this)
                );

                break;

            case "add-comp-gt-expr-btn":
                this.pressButton(
                    id,
                    (() => {
                        this.module.insert(new ast.ComparatorExpr(ast.ComparatorOp.GreaterThan));
                    }).bind(this)
                );

                break;

            case "add-comp-gte-expr-btn":
                this.pressButton(
                    id,
                    (() => {
                        this.module.insert(new ast.ComparatorExpr(ast.ComparatorOp.GreaterThanEqual));
                    }).bind(this)
                );

                break;

            case "add-while-expr-btn":
                this.pressButton(
                    id,
                    (() => {
                        this.module.insert(new ast.WhileStatement());
                    }).bind(this)
                );

                break;

            case "add-if-expr-btn":
                this.pressButton(
                    id,
                    (() => {
                        this.module.insert(new ast.IfStatement());
                    }).bind(this)
                );

                break;

            case "add-elif-expr-btn":
                this.pressButton(
                    id,
                    (() => {
                        this.module.insert(new ast.ElseStatement(true));
                    }).bind(this)
                );

                break;

            case "add-else-expr-btn":
                this.pressButton(
                    id,
                    (() => {
                        this.module.insert(new ast.ElseStatement(false));
                    }).bind(this)
                );

                break;

            case "add-for-expr-btn":
                this.pressButton(
                    id,
                    (() => {
                        this.module.insert(new ast.ForStatement());
                    }).bind(this)
                );

                break;

            case "add-list-literal-btn":
                this.pressButton(
                    id,
                    (() => {
                        this.module.insert(new ast.ListLiteralExpression());
                    }).bind(this)
                );

                break;

            case "add-list-item-btn":
                if (this.module.validator.canAddListItemToRight(context)) {
                    this.module.executer.execute(
                        new EditAction(EditActionType.InsertEmptyListItem, { toRight: true }),
                        context
                    );
                } else if (this.module.validator.canAddListItemToLeft(context)) {
                    this.module.executer.execute(
                        new EditAction(EditActionType.InsertEmptyListItem, { toLeft: true }),
                        context
                    );
                }

                this.module.editor.monaco.focus();

                break;

            case "add-list-append-stmt-btn":
                this.pressButton(
                    id,
                    (() => {
                        this.module.insert(
                            new ast.MethodCallStmt("append", [new ast.Argument([ast.DataType.Any], "object", false)])
                        );
                    }).bind(this)
                );

                break;

            case "add-list-index-btn":
                this.pressButton(
                    id,
                    (() => {
                        this.module.insert(new ast.MemberCallStmt(ast.DataType.Any));
                    }).bind(this)
                );

                break;

            case "add-split-method-call-btn":
                this.pressButton(
                    id,
                    (() => {
                        this.module.insert(
                            new ast.MethodCallExpr(
                                "split",
                                [new ast.Argument([ast.DataType.String], "sep", false)],
                                ast.DataType.StringList,
                                ast.DataType.String
                            )
                        );
                    }).bind(this)
                );

                break;

            case "add-join-method-call-btn":
                this.pressButton(
                    id,
                    (() => {
                        this.module.insert(
                            new ast.MethodCallExpr(
                                "join",
                                [
                                    new ast.Argument(
                                        [
                                            ast.DataType.AnyList,
                                            ast.DataType.StringList,
                                            ast.DataType.NumberList,
                                            ast.DataType.BooleanList,
                                        ],
                                        "items",
                                        false
                                    ),
                                ],
                                ast.DataType.String,
                                ast.DataType.String
                            )
                        );
                    }).bind(this)
                );

                break;

            case "add-replace-method-call-btn":
                this.pressButton(
                    id,
                    (() => {
                        this.module.insert(
                            new ast.MethodCallExpr(
                                "replace",
                                [
                                    new ast.Argument([ast.DataType.String], "old", false),
                                    new ast.Argument([ast.DataType.String], "new", false),
                                ],
                                ast.DataType.String,
                                ast.DataType.String
                            )
                        );
                    }).bind(this)
                );

                break;

            case "add-find-method-call-btn":
                this.pressButton(
                    id,
                    (() => {
                        this.module.insert(
                            new ast.MethodCallExpr(
                                "find",
                                [new ast.Argument([ast.DataType.String], "item", false)],
                                ast.DataType.Number,
                                ast.DataType.String
                            )
                        );
                    }).bind(this)
                );

                break;

            case "add-list-elem-assign-btn":
                this.pressButton(
                    id,
                    (() => {
                        this.module.insert(new ast.ListElementAssignment());
                    }).bind(this)
                );

                break;

            default:
        }
    }

    onMouseMove(e) {
        this.module.editor.mousePosMonaco = e.target.position;
    }

    onDidScrollChange(e) {
        this.module.editor.scrollOffsetTop = e.scrollTop;
    }

    private pressButton(buttonId: string, callback: Function) {
        if (!(document.getElementById(buttonId) as HTMLButtonElement).disabled) {
            callback();
        }
    }
}
