import * as ast from "../syntax-tree/ast";
import * as monaco from "monaco-editor";
import { TAB_SPACES } from "../syntax-tree/keywords";
import { ErrorMessage } from "../notification-system/error-msg-generator";
import * as keywords from "../syntax-tree/keywords";
import { BinaryOperator, DataType } from "../syntax-tree/ast";
import { ConstructKeys, Util } from "../utilities/util";
import { Hole } from "./hole";

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

export class EventHandler {
    module: ast.Module;

    constructor(module: ast.Module) {
        this.module = module;
    }

    getKeyAction(e: KeyboardEvent) {
        const context = this.module.focus.getContext();
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

                    if (
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
                if (inTextEditMode) {
                    if (e.ctrlKey) return EditAction.DeleteToEnd;
                    else return EditAction.DeleteNextChar;
                } else return EditAction.DeleteNextToken;

            case KeyPress.Backspace:
                if (inTextEditMode) {
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

            case KeyPress.Plus:
                if (!inTextEditMode && e.shiftKey && e.key.length == 1) return EditAction.CompleteAddition;

                break;

            case KeyPress.Star:
                if (!inTextEditMode && e.shiftKey && e.key.length == 1) return EditAction.CompleteMultiplication;

                break;

            case KeyPress.Minus:
                if (!inTextEditMode && e.key.length == 1) return EditAction.CompleteSubtraction;

                break;

            case KeyPress.ForwardSlash:
                if (!inTextEditMode && e.key.length == 1) return EditAction.CompleteDivision;

                break;

            case KeyPress.GreaterThan:
                if (!inTextEditMode && e.shiftKey && e.key.length == 1) return EditAction.DisplayGreaterThanSuggestion;

                break;

            case KeyPress.LessThan:
                if (!inTextEditMode && e.shiftKey && e.key.length == 1) return EditAction.DisplayLessThanSuggestion;

                break;

            case KeyPress.Escape:
                if (!inTextEditMode && this.module.menuController.isMenuOpen()) return EditAction.CloseValidInsertMenu;

                break;

            case KeyPress.Equals:
                if (!inTextEditMode && e.key.length == 1) return EditAction.DisplayEqualsSuggestion;

                break;

            case KeyPress.Space:
                if (!inTextEditMode && e.ctrlKey && e.key.length == 1) return EditAction.OpenValidInsertMenu;

                break;

            //TODO: Remove later
            case KeyPress.P:
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
        const action = this.getKeyAction(e.browserEvent);
        const selection = this.module.editor.monaco.getSelection();
        let suggestions = [];

        const context = this.module.focus.getContext();

        let focusedNode = this.module.focus.onEmptyLine() ? context.lineStatement : context?.token;

        switch (action) {
            case EditAction.InsertEmptyLine: {
                this.module.insertEmptyLine();

                e.preventDefault();
                e.stopPropagation();
                break;
            }

            case EditAction.SelectPrevToken: {
                this.module.focus.navigateLeft();

                e.preventDefault();
                e.stopPropagation();
                break;
            }

            case EditAction.SelectNextToken: {
                this.module.focus.navigateRight();

                e.preventDefault();
                e.stopPropagation();
                break;
            }

            case EditAction.InsertChar: {
                const cursorPos = this.module.editor.monaco.getPosition();
                const selectedText = this.module.editor.monaco.getSelection();
                const token = this.module.focus.getTextEditableItem(context);
                let newText = "";

                if (token.getEditableText() == "   ") {
                    const curText = "";
                    newText = curText + e.browserEvent.key;
                } else {
                    const curText = token.getEditableText().split("");
                    curText.splice(
                        cursorPos.column - token.getLeft(),
                        Math.abs(selectedText.startColumn - selectedText.endColumn),
                        e.browserEvent.key
                    );

                    newText = curText.join("");
                }

                // TODO: this.module.focus.isInsideIdentifier()
                if (context.selected && context?.token instanceof ast.IdentifierTkn) {
                    let newNotification = false;

                    /*TODO: Change this to use the new focus.
                     *
                     * This needs to use whatever code construct is used for the check in the if-statement above.
                     */
                    if (Object.keys(keywords.PythonKeywords).indexOf(newText) > -1) {
                        this.module.notificationSystem.addHoverNotification(
                            context?.token,
                            { identifier: newText },
                            ErrorMessage.identifierIsKeyword
                        );
                        newNotification = true;
                    } else if (Object.keys(keywords.BuiltInFunctions).indexOf(newText) > -1) {
                        this.module.notificationSystem.addHoverNotification(
                            context?.token,
                            { identifier: newText },
                            ErrorMessage.identifierIsBuiltInFunc
                        );

                        newNotification = true;
                    }

                    if (!newNotification && context?.token.notification) {
                        this.module.notificationSystem.removeNotificationFromConstruct(context?.token);
                    }
                }

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

                    this.module.editor.executeEdits(editRange, null, e.browserEvent.key);
                }

                e.preventDefault();
                e.stopPropagation();

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

                if (context.selected && context?.token instanceof ast.IdentifierTkn) {
                    let newNotification = false;

                    if (Object.keys(keywords.PythonKeywords).indexOf(newText) > -1) {
                        /*TODO: Change this to use the new focus.
                         *
                         * This needs to use whatever code construct is used for the check in the if-statement above.
                         */
                        this.module.notificationSystem.addHoverNotification(
                            context?.token,
                            { identifier: newText },
                            ErrorMessage.identifierIsKeyword
                        );
                        newNotification = true;
                    } else if (Object.keys(keywords.BuiltInFunctions).indexOf(newText) > -1) {
                        this.module.notificationSystem.addHoverNotification(
                            context?.token,
                            { identifier: newText },
                            ErrorMessage.identifierIsBuiltInFunc
                        );
                        newNotification = true;
                    }

                    if (!newNotification && context?.token.notification) {
                        this.module.notificationSystem.removeNotificationFromConstruct(context?.token);
                    }
                }

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
                } else {
                    e.stopPropagation();
                    e.preventDefault();
                }

                break;
            }

            case EditAction.SelectClosestTokenAbove: {
                this.module.focus.navigateUp();

                e.stopPropagation();
                e.preventDefault();

                break;
            }

            case EditAction.SelectClosestTokenBelow: {
                this.module.focus.navigateDown();

                e.stopPropagation();
                e.preventDefault();

                break;
            }

            case EditAction.MoveCursorLeft:
                break;

            case EditAction.MoveCursorRight:
                break;

            case EditAction.SelectLeft:
                break;

            case EditAction.SelectRight:
                break;

            case EditAction.SelectToStart:
                break;

            case EditAction.SelectToEnd:
                break;

            case EditAction.Copy:
                break;

            case EditAction.CompleteAddition:
                this.module.constructCompleter.completeArithmeticConstruct(BinaryOperator.Add);

                e.preventDefault();
                e.stopPropagation();
                break;

            case EditAction.CompleteSubtraction:
                this.module.constructCompleter.completeArithmeticConstruct(BinaryOperator.Subtract);

                e.preventDefault();
                e.stopPropagation();
                break;

            case EditAction.CompleteDivision:
                this.module.constructCompleter.completeArithmeticConstruct(BinaryOperator.Divide);

                e.preventDefault();
                e.stopPropagation();
                break;

            case EditAction.CompleteMultiplication:
                this.module.constructCompleter.completeArithmeticConstruct(BinaryOperator.Multiply);

                e.preventDefault();
                e.stopPropagation();
                break;

            case EditAction.CompleteIntLiteral:
                this.module.constructCompleter.completeLiteralConstruct(DataType.Number);

                e.preventDefault();
                e.stopPropagation();
                break;

            case EditAction.CompleteStringLiteral:
                this.module.constructCompleter.completeLiteralConstruct(DataType.String);

                e.preventDefault();
                e.stopPropagation();
                break;

            case EditAction.CompleteBoolLiteral:
                this.module.constructCompleter.completeBoolLiteralConstruct(e.browserEvent.key === "t" ? 1 : 0);

                e.preventDefault();
                e.stopPropagation();
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

                e.preventDefault();
                e.stopPropagation();
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

                e.preventDefault();
                e.stopPropagation();
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

                e.preventDefault();
                e.stopPropagation();
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

                e.preventDefault();
                e.stopPropagation();
                break;

            //TODO: Remove later
            case EditAction.OpenValidInsertMenuSingleLevel:
                if (!this.module.menuController.isMenuOpen()) {
                    const suggestions = this.module.getAllValidInsertsList(focusedNode);
                    this.module.menuController.buildSingleLevelConstructCategoryMenu(suggestions);
                } else this.module.menuController.removeMenus();

                e.preventDefault();
                e.stopPropagation();
                break;

            case EditAction.SelectMenuSuggestionAbove:
                this.module.menuController.focusOptionAbove();

                e.stopPropagation();
                e.preventDefault();
                break;

            case EditAction.SelectMenuSuggestionBelow:
                this.module.menuController.focusOptionBelow();

                e.stopPropagation();
                e.preventDefault();
                break;

            case EditAction.SelectMenuSuggestion:
                this.module.menuController.selectFocusedOption();

                e.stopPropagation();
                e.preventDefault();
                break;

            case EditAction.CloseValidInsertMenu:
                this.module.menuController.removeMenus();

                e.stopPropagation();
                e.preventDefault();
                break;

            case EditAction.OpenSubMenu:
                this.module.menuController.openSubMenu();

                e.stopPropagation();
                e.preventDefault();
                break;

            case EditAction.CloseSubMenu:
                this.module.menuController.closeSubMenu();

                e.stopPropagation();
                e.preventDefault();
                break;

            default:
                e.preventDefault();
                e.stopPropagation();
        }
    }

    onMouseDown(e) {
        this.module.focus.navigatePos(e.target.position);

        Hole.disableEditableHoleHighlights();
        this.module.focus.highlightTextEditableHole();
    }

    onButtonDown(id: string) {
        switch (id) {
            case "add-var-btn":
                if (!(document.getElementById("add-var-btn") as HTMLButtonElement).disabled) {
                    this.module.insert(new ast.VarAssignmentStmt());
                }

                break;

            case "add-print-btn":
                this.module.insert(
                    new ast.FunctionCallStmt(
                        "print",
                        [new ast.Argument(ast.DataType.Any, "item", false)],
                        ast.DataType.Void
                    )
                );

                break;

            case "add-randint-btn":
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

                break;

            case "add-range-btn":
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

                break;

            case "add-len-btn":
                this.module.insert(
                    new ast.FunctionCallStmt(
                        "len",
                        [new ast.Argument(ast.DataType.List, "list", false)],
                        ast.DataType.Number
                    )
                );

                break;

            case "add-str-btn":
                this.module.insert(new ast.LiteralValExpr(ast.DataType.String));

                break;

            case "add-num-btn":
                this.module.insert(new ast.LiteralValExpr(ast.DataType.Number));

                break;

            case "add-true-btn":
                this.module.insert(new ast.LiteralValExpr(ast.DataType.Boolean, "True"));

                break;

            case "add-false-btn":
                this.module.insert(new ast.LiteralValExpr(ast.DataType.Boolean, "False"));

                break;

            case "add-bin-add-expr-btn":
                this.module.insert(new ast.BinaryOperatorExpr(ast.BinaryOperator.Add, ast.DataType.Any));

                break;

            case "add-bin-sub-expr-btn":
                this.module.insert(new ast.BinaryOperatorExpr(ast.BinaryOperator.Subtract, ast.DataType.Any));

                break;

            case "add-bin-mul-expr-btn":
                this.module.insert(new ast.BinaryOperatorExpr(ast.BinaryOperator.Multiply, ast.DataType.Any));

                break;

            case "add-bin-div-expr-btn":
                this.module.insert(new ast.BinaryOperatorExpr(ast.BinaryOperator.Divide, ast.DataType.Any));

                break;

            case "add-bin-and-expr-btn":
                this.module.insert(new ast.BinaryBoolOperatorExpr(ast.BoolOperator.And));

                break;

            case "add-bin-or-expr-btn":
                this.module.insert(new ast.BinaryBoolOperatorExpr(ast.BoolOperator.Or));

                break;

            case "add-unary-not-expr-btn":
                this.module.insert(
                    new ast.UnaryOperatorExpr(ast.UnaryOp.Not, ast.DataType.Boolean, ast.DataType.Boolean)
                );

                break;

            case "add-comp-eq-expr-btn":
                this.module.insert(new ast.ComparatorExpr(ast.ComparatorOp.Equal));

                break;

            case "add-comp-neq-expr-btn":
                this.module.insert(new ast.ComparatorExpr(ast.ComparatorOp.NotEqual));

                break;

            case "add-comp-lt-expr-btn":
                this.module.insert(new ast.ComparatorExpr(ast.ComparatorOp.LessThan));

                break;

            case "add-comp-lte-expr-btn":
                this.module.insert(new ast.ComparatorExpr(ast.ComparatorOp.LessThanEqual));

                break;

            case "add-comp-gt-expr-btn":
                this.module.insert(new ast.ComparatorExpr(ast.ComparatorOp.GreaterThan));

                break;

            case "add-comp-gte-expr-btn":
                this.module.insert(new ast.ComparatorExpr(ast.ComparatorOp.GreaterThanEqual));

                break;

            case "add-while-expr-btn":
                this.module.insert(new ast.WhileStatement());

                break;

            case "add-if-expr-btn":
                this.module.insert(new ast.IfStatement());

                break;

            case "add-elif-expr-btn":
                this.module.insert(new ast.ElseStatement(true));

                break;

            case "add-else-expr-btn":
                this.module.insert(new ast.ElseStatement(false));

                break;

            case "add-for-expr-btn":
                this.module.insert(new ast.ForStatement());

                break;

            case "add-list-literal-btn":
                this.module.insert(new ast.ListLiteralExpression());

                break;

            case "add-list-item-btn":
                this.module.insertListItem();

                break;

            case "add-list-append-stmt-btn":
                this.module.insert(
                    new ast.MethodCallStmt("append", [new ast.Argument(ast.DataType.Any, "object", false)])
                );

                break;

            case "add-list-index-btn":
                this.module.insert(new ast.MemberCallStmt(ast.DataType.Any));

                break;

            case "add-split-method-call-btn":
                this.module.insert(
                    new ast.MethodCallExpr(
                        "split",
                        [new ast.Argument(ast.DataType.String, "sep", false)],
                        ast.DataType.List,
                        ast.DataType.String
                    )
                );

                break;

            case "add-join-method-call-btn":
                this.module.insert(
                    new ast.MethodCallExpr(
                        "join",
                        [new ast.Argument(ast.DataType.List, "items", false)],
                        ast.DataType.String,
                        ast.DataType.String
                    )
                );

                break;

            case "add-replace-method-call-btn":
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

                break;

            case "add-find-method-call-btn":
                this.module.insert(
                    new ast.MethodCallExpr(
                        "find",
                        [new ast.Argument(ast.DataType.String, "item", false)],
                        ast.DataType.Number,
                        ast.DataType.String
                    )
                );

                break;

            case "add-list-elem-assign-btn":
                this.module.insert(new ast.ListElementAssignment());

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
}
