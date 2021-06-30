import * as ast from "../syntax-tree/ast";
import * as monaco from "monaco-editor";
import { TAB_SPACES } from "../syntax-tree/keywords";
import { ErrorMessage } from "../notification-system/error-msg-generator";
import * as keywords from "../syntax-tree/keywords";
import { BinaryOperator, DataType } from "../syntax-tree/ast";
import { ConstructKeys, Util } from "../utilities/util";
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

export class EventHandler {
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

                    this.module.editor.executeEdits(editRange, null, e.browserEvent.key);
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
                const code = [new ast.NonEditableTkn(", "), new ast.EmptyExpr()];
                this.module.insertAfterIndex(context.tokenToRight, context.tokenToRight.indexInRoot, code);
                this.module.editor.insertAtCurPos(code);
                this.module.focus.updateContext({ tokenToSelect: code[1] });

                break;
            }

            case EditAction.InsertEmptyLeftListItem: {
                const code = [new ast.EmptyExpr(), new ast.NonEditableTkn(", ")];
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
                this.module.constructCompleter.completeLiteralConstruct(DataType.Number, e.browserEvent.key);

                break;

            case EditAction.CompleteStringLiteral:
                this.module.constructCompleter.completeLiteralConstruct(DataType.String, "");

                break;

            case EditAction.CompleteBoolLiteral:
                this.module.constructCompleter.completeBoolLiteralConstruct(e.browserEvent.key === "t" ? 1 : 0);

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

        if (preventDefaultEvent) {
            e.preventDefault();
            e.stopPropagation();
        }
    }

    onMouseDown(e) {
        this.module.focus.navigatePos(e.target.position);
    }

    onButtonDown(id: string) {
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
                // this.pressButton(
                //     id,
                //     (() => {
                //         this.module.insertListItem();
                //     }).bind(this)
                // );

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

    private validateIdentifier(context: Context, identifierText: string) {
        let focusedNode = null;
        if (context.token && context.selected && context.token instanceof ast.IdentifierTkn) {
            focusedNode = context.token;
        } else if (context.tokenToLeft && context.tokenToLeft instanceof ast.IdentifierTkn) {
            focusedNode = context.tokenToLeft;
        } else if (context.tokenToRight && context.tokenToRight instanceof ast.IdentifierTkn) {
            focusedNode = context.tokenToRight;
        }

        if (
            focusedNode instanceof ast.IdentifierTkn ||
            context.tokenToLeft instanceof ast.IdentifierTkn ||
            context.tokenToRight instanceof ast.IdentifierTkn
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
