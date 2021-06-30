import * as ast from "../syntax-tree/ast";
import { TAB_SPACES } from "../syntax-tree/keywords";
import { Context } from "./focus";

export enum KeyPress {
    // navigation:
    ArrowLeft = "ArrowLeft",
    ArrowRight = "ArrowRight",
    ArrowUp = "ArrowUp",
    ArrowDown = "ArrowDown",

    Home = "Home",
    End = "End",

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

export enum EditAction {
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

    InsertEmptyLeftListItem,
    InsertEmptyRightListItem,

    DeleteNextToken,
    DeletePrevToken,

    InsertChar,

    None,

    //typing actions
    CompleteAddition,
    CompleteDivision,
    CompleteMultiplication,
    CompleteSubtraction,

    CompleteIntLiteral,
    CompleteStringLiteral,
    CompleteBoolLiteral,

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

        switch (e.key) {
            case KeyPress.ArrowUp:
                if (this.module.menuController.isMenuOpen()) return EditAction.SelectMenuSuggestionAbove;

                return EditAction.SelectClosestTokenAbove;

            case KeyPress.ArrowDown:
                if (this.module.menuController.isMenuOpen()) return EditAction.SelectMenuSuggestionBelow;

                return EditAction.SelectClosestTokenBelow;

            case KeyPress.ArrowLeft:
                if (!inTextEditMode && this.module.menuController.isMenuOpen()) return EditAction.CloseSubMenu;

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
                    )
                        return EditAction.SelectPrevToken;
                    if (e.shiftKey && e.ctrlKey) return EditAction.SelectToStart;
                    else if (e.shiftKey) return EditAction.SelectLeft;
                    else if (e.ctrlKey) return EditAction.MoveCursorStart;
                    else return EditAction.MoveCursorLeft;
                } else return EditAction.SelectPrevToken;

            case KeyPress.ArrowRight:
                if (!inTextEditMode && this.module.menuController.isMenuOpen()) return EditAction.OpenSubMenu;

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
                        return EditAction.SelectNextToken;
                    }

                    if (e.shiftKey && e.ctrlKey) return EditAction.SelectToEnd;
                    else if (e.shiftKey) return EditAction.SelectRight;
                    else if (e.ctrlKey) return EditAction.MoveCursorEnd;
                    else return EditAction.MoveCursorRight;
                } else return EditAction.SelectNextToken;

            case KeyPress.Home:
                if (inTextEditMode) {
                    if (e.shiftKey) return EditAction.SelectToStart;
                    else return EditAction.MoveCursorStart;
                }

                break;

            case KeyPress.End:
                if (inTextEditMode) {
                    if (e.shiftKey) return EditAction.SelectToEnd;
                    else return EditAction.MoveCursorEnd;
                }

                break;

            case KeyPress.Delete:
                if (inTextEditMode && !(context.tokenToRight instanceof ast.NonEditableTkn)) {
                    if (e.ctrlKey) return EditAction.DeleteToEnd;
                    else return EditAction.DeleteNextChar;
                } else return EditAction.DeleteNextToken;

            case KeyPress.Backspace:
                if (inTextEditMode && !(context.tokenToLeft instanceof ast.NonEditableTkn)) {
                    if (e.ctrlKey) return EditAction.DeleteToStart;
                    else return EditAction.DeletePrevChar;
                } else return EditAction.DeletePrevToken;

            case KeyPress.Enter:
                if (this.module.menuController.isMenuOpen()) return EditAction.SelectMenuSuggestion;

                const curSelection = this.module.editor.monaco.getSelection();
                const curStatement = this.module.focus.getFocusedStatement();
                const parent = curStatement.rootNode;
                let leftPosToCheck = 1;

                if (parent instanceof ast.Statement && parent.body.length > 0) {
                    // is inside the body of another statement
                    leftPosToCheck = parent.left + TAB_SPACES;
                }

                if (curSelection.startColumn == curSelection.endColumn) {
                    if (curPos.column == leftPosToCheck || curPos.column == curStatement.right)
                        return EditAction.InsertEmptyLine;
                }

                break;

            case KeyPress.Comma:
                if (this.module.validator.canAddListItemToRight(context)) return EditAction.InsertEmptyRightListItem;
                else if (this.module.validator.canAddListItemToLeft(context)) return EditAction.InsertEmptyLeftListItem;
                else if (inTextEditMode) return EditAction.InsertChar;

                break;

            case KeyPress.Plus:
                if (inTextEditMode) return EditAction.InsertChar;
                if (!inTextEditMode && e.shiftKey && e.key.length == 1) return EditAction.CompleteAddition;

                break;

            case KeyPress.Star:
                if (inTextEditMode) return EditAction.InsertChar;
                if (!inTextEditMode && e.shiftKey && e.key.length == 1) return EditAction.CompleteMultiplication;

                break;

            case KeyPress.Minus:
                if (inTextEditMode) return EditAction.InsertChar;
                if (!inTextEditMode && e.key.length == 1) return EditAction.CompleteSubtraction;

                break;

            case KeyPress.ForwardSlash:
                if (inTextEditMode) return EditAction.InsertChar;
                if (!inTextEditMode && e.key.length == 1) return EditAction.CompleteDivision;

                break;

            case KeyPress.GreaterThan:
                if (inTextEditMode) return EditAction.InsertChar;
                if (!inTextEditMode && e.shiftKey && e.key.length == 1) return EditAction.DisplayGreaterThanSuggestion;

                break;

            case KeyPress.LessThan:
                if (inTextEditMode) return EditAction.InsertChar;
                if (!inTextEditMode && e.shiftKey && e.key.length == 1) return EditAction.DisplayLessThanSuggestion;

                break;

            case KeyPress.Escape:
                if (inTextEditMode) return EditAction.InsertChar;
                if (!inTextEditMode && this.module.menuController.isMenuOpen()) return EditAction.CloseValidInsertMenu;

                break;

            case KeyPress.Equals:
                if (inTextEditMode) return EditAction.InsertChar;
                if (!inTextEditMode && e.key.length == 1) return EditAction.DisplayEqualsSuggestion;

                break;

            case KeyPress.Space:
                if (inTextEditMode) return EditAction.InsertChar;
                if (!inTextEditMode && e.ctrlKey && e.key.length == 1) return EditAction.OpenValidInsertMenu;

                break;

            //TODO: Remove later
            case KeyPress.P:
                if (inTextEditMode) return EditAction.InsertChar;
                if (!inTextEditMode && e.ctrlKey && e.key.length == 1) return EditAction.OpenValidInsertMenuSingleLevel;

                break;

            default:
                if (inTextEditMode) {
                    if (e.key.length == 1) {
                        switch (e.key) {
                            case KeyPress.C:
                                if (e.ctrlKey) return EditAction.Copy;

                                break;

                            case KeyPress.V:
                                if (e.ctrlKey) return EditAction.Paste;

                                break;

                            case KeyPress.Z:
                                if (e.ctrlKey) return EditAction.Undo;

                                break;

                            case KeyPress.Y:
                                if (e.ctrlKey) return EditAction.Redo;

                                break;
                        }

                        return EditAction.InsertChar;
                    }
                } else {
                    if (["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].indexOf(e.key) > -1) {
                        return EditAction.CompleteIntLiteral;
                    } else if (["t", "f"].indexOf(e.key) > -1) return EditAction.CompleteBoolLiteral;
                    else if (['"'].indexOf(e.key) > -1) return EditAction.CompleteStringLiteral;

                    return EditAction.None;
                }
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
                                [new ast.Argument(ast.DataType.Any, "item", false)],
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
                                    new ast.Argument(ast.DataType.Number, "start", false),
                                    new ast.Argument(ast.DataType.Number, "end", false),
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
                                    new ast.Argument(ast.DataType.Number, "start", false),
                                    new ast.Argument(ast.DataType.Number, "end", false),
                                ],
                                ast.DataType.List
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
                                [new ast.Argument(ast.DataType.List, "list", false)],
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
                if (this.module.validator.canAddListItemToRight(context)) this.module.executer.execute(EditAction.InsertEmptyRightListItem, context);
                else if (this.module.validator.canAddListItemToLeft(context)) this.module.executer.execute(EditAction.InsertEmptyLeftListItem, context);

                this.module.editor.monaco.focus();
                
                break;

            case "add-list-append-stmt-btn":
                this.pressButton(
                    id,
                    (() => {
                        this.module.insert(
                            new ast.MethodCallStmt("append", [new ast.Argument(ast.DataType.Any, "object", false)])
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
                                [new ast.Argument(ast.DataType.String, "sep", false)],
                                ast.DataType.List,
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
                                [new ast.Argument(ast.DataType.List, "items", false)],
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
                                    new ast.Argument(ast.DataType.String, "old", false),
                                    new ast.Argument(ast.DataType.String, "new", false),
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
                                [new ast.Argument(ast.DataType.String, "item", false)],
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
