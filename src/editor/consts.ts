import { InsertActionData } from "./data-types";
import { BinaryOperator, DataType, UnaryOp } from "../syntax-tree/consts";

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
    DeleteListItem,

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
    IndentBackwardsIfStmt,
    IndentForwards,
    IndentForwardsIfStmt,

    InsertChar,

    None,

    //typing actions
    InsertBinaryOperator,
    InsertUnaryOperator,
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

    //TODO: Remove later (for the continuous menu with categories)
    OpenValidInsertMenuSingleLevel,

    CloseDraftMode,

    InsertStatement,
    InsertExpression,
    WrapExpressionWithItem,

    InsertVarAssignStatement,
    InsertVariableRef,
    InsertDotMethod,
    InsertElseStatement,
}

export enum ConstructName {
    VarAssignment = "VarAssignmentStmt",
    Default = "Default",
}

export enum InsertActionType {
    InsertNewVariableStmt,
    InsertVariableReference,

    InsertWhileStmt,
    InsertIfStmt,
    InsertElifStmt,
    InsertElseStmt,
    InsertForStmt,

    InsertPrintFunctionStmt,
    InsertRandintExpr,
    InsertRangeExpr,
    InsertLenExpr,
    InsertCastStrExpr,

    InsertListLiteral,
    InsertListItem,
    InsertLiteral,

    InsertUnaryExpr,
    InsertBinaryExpr,

    InsertListAppendMethod,
    InsertListIndexAccessor,
    InsertListIndexAssignment,

    InsertStringSplitMethod,
    InsertStringJoinMethod,
    InsertStringReplaceMethod,
    InsertStringFindMethod,
}

export const InsertActionMap = new Map<string, InsertActionData>();

export const InsertVarStmtAction = new InsertActionData("add-var-btn", InsertActionType.InsertNewVariableStmt);
InsertActionMap.set(InsertVarStmtAction.cssId, InsertVarStmtAction);

export const InsertListIndexStmtAction = new InsertActionData(
    "add-list-elem-assign-btn",
    InsertActionType.InsertListIndexAssignment
);
InsertActionMap.set(InsertListIndexStmtAction.cssId, InsertListIndexStmtAction);

export const InsertPrintCallAction = new InsertActionData("add-print-btn", InsertActionType.InsertPrintFunctionStmt);
InsertActionMap.set(InsertPrintCallAction.cssId, InsertPrintCallAction);

export const InsertRandintCallAction = new InsertActionData("add-randint-btn", InsertActionType.InsertRandintExpr);
InsertActionMap.set(InsertRandintCallAction.cssId, InsertRandintCallAction);

export const InsertRangeCallAction = new InsertActionData("add-range-btn", InsertActionType.InsertRangeExpr);
InsertActionMap.set(InsertRangeCallAction.cssId, InsertRangeCallAction);

export const InsertLenCallAction = new InsertActionData("add-len-btn", InsertActionType.InsertLenExpr);
InsertActionMap.set(InsertLenCallAction.cssId, InsertLenCallAction);

export const InsertStrLiteralAction = new InsertActionData("add-str-btn", InsertActionType.InsertLiteral, {
    literalType: DataType.String,
    initialValue: "",
});
InsertActionMap.set(InsertStrLiteralAction.cssId, InsertStrLiteralAction);

export const InsertNumLiteralAction = new InsertActionData("add-num-btn", InsertActionType.InsertLiteral, {
    literalType: DataType.Number,
    initialValue: "0",
});
InsertActionMap.set(InsertNumLiteralAction.cssId, InsertNumLiteralAction);

export const InsertBoolTrueAction = new InsertActionData("add-true-btn", InsertActionType.InsertLiteral, {
    literalType: DataType.Boolean,
    initialValue: "True",
});
InsertActionMap.set(InsertBoolTrueAction.cssId, InsertBoolTrueAction);

export const InsertBoolFalseAction = new InsertActionData("add-false-btn", InsertActionType.InsertLiteral, {
    literalType: DataType.Boolean,
    initialValue: "False",
});
InsertActionMap.set(InsertBoolTrueAction.cssId, InsertBoolTrueAction);

export const InsertBinAddAction = new InsertActionData("add-bin-add-expr-btn", InsertActionType.InsertBinaryExpr, {
    operator: BinaryOperator.Add,
});
InsertActionMap.set(InsertBoolTrueAction.cssId, InsertBoolTrueAction);

export const InsertBinSubAction = new InsertActionData("add-bin-sub-expr-btn", InsertActionType.InsertBinaryExpr, {
    operator: BinaryOperator.Subtract,
});
InsertActionMap.set(InsertBinSubAction.cssId, InsertBinSubAction);

export const InsertBinMulAction = new InsertActionData("add-bin-mul-expr-btn", InsertActionType.InsertBinaryExpr, {
    operator: BinaryOperator.Multiply,
});
InsertActionMap.set(InsertBinMulAction.cssId, InsertBinMulAction);

export const InsertBinDivAction = new InsertActionData("add-bin-div-expr-btn", InsertActionType.InsertBinaryExpr, {
    operator: BinaryOperator.Divide,
});
InsertActionMap.set(InsertBinDivAction.cssId, InsertBinDivAction);

export const InsertBinAndAction = new InsertActionData("add-bin-and-expr-btn", InsertActionType.InsertBinaryExpr, {
    operator: BinaryOperator.And,
});
InsertActionMap.set(InsertBinAndAction.cssId, InsertBinAndAction);

export const InsertBinOrAction = new InsertActionData("add-bin-or-expr-btn", InsertActionType.InsertBinaryExpr, {
    operator: BinaryOperator.Or,
});
InsertActionMap.set(InsertBinOrAction.cssId, InsertBinOrAction);

export const InsertBinEqAction = new InsertActionData("add-comp-eq-expr-btn", InsertActionType.InsertBinaryExpr, {
    operator: BinaryOperator.Equal,
});
InsertActionMap.set(InsertBinEqAction.cssId, InsertBinEqAction);

export const InsertBinNeqAction = new InsertActionData("add-comp-neq-expr-btn", InsertActionType.InsertBinaryExpr, {
    operator: BinaryOperator.NotEqual,
});
InsertActionMap.set(InsertBinNeqAction.cssId, InsertBinNeqAction);

export const InsertBinLtAction = new InsertActionData("add-comp-lt-expr-btn", InsertActionType.InsertBinaryExpr, {
    operator: BinaryOperator.LessThan,
});
InsertActionMap.set(InsertBinLtAction.cssId, InsertBinLtAction);

export const InsertBinLteAction = new InsertActionData("add-comp-lte-expr-btn", InsertActionType.InsertBinaryExpr, {
    operator: BinaryOperator.LessThanEqual,
});
InsertActionMap.set(InsertBinLteAction.cssId, InsertBinLteAction);

export const InsertBinGtAction = new InsertActionData("add-comp-gt-expr-btn", InsertActionType.InsertBinaryExpr, {
    operator: BinaryOperator.GreaterThan,
});
InsertActionMap.set(InsertBinGtAction.cssId, InsertBinGtAction);

export const InsertBinGteAction = new InsertActionData("add-comp-gte-expr-btn", InsertActionType.InsertBinaryExpr, {
    operator: BinaryOperator.GreaterThanEqual,
});
InsertActionMap.set(InsertBinGteAction.cssId, InsertBinGteAction);

export const InsertUnaryNotAction = new InsertActionData("add-unary-not-expr-btn", InsertActionType.InsertUnaryExpr, {
    operator: UnaryOp.Not,
});
InsertActionMap.set(InsertUnaryNotAction.cssId, InsertUnaryNotAction);

export const InsertWhileStmtAction = new InsertActionData("add-while-expr-btn", InsertActionType.InsertWhileStmt);
InsertActionMap.set(InsertWhileStmtAction.cssId, InsertWhileStmtAction);

export const InsertIfStmtAction = new InsertActionData("add-if-expr-btn", InsertActionType.InsertIfStmt);
InsertActionMap.set(InsertIfStmtAction.cssId, InsertIfStmtAction);

export const InsertElifStmtAction = new InsertActionData("add-elif-expr-btn", InsertActionType.InsertElifStmt);
InsertActionMap.set(InsertElifStmtAction.cssId, InsertElifStmtAction);

export const InsertElseStmtAction = new InsertActionData("add-else-expr-btn", InsertActionType.InsertElseStmt);
InsertActionMap.set(InsertElseStmtAction.cssId, InsertElseStmtAction);

export const InsertForStmtAction = new InsertActionData("add-for-expr-btn", InsertActionType.InsertForStmt);
InsertActionMap.set(InsertForStmtAction.cssId, InsertForStmtAction);

export const InsertListLiteralAction = new InsertActionData("add-list-literal-btn", InsertActionType.InsertListLiteral);
InsertActionMap.set(InsertListLiteralAction.cssId, InsertListLiteralAction);

export const InsertListItemAction = new InsertActionData("add-list-item-btn", InsertActionType.InsertListItem);
InsertActionMap.set(InsertListItemAction.cssId, InsertListItemAction);

export const InsertListAccessorAction = new InsertActionData(
    "add-list-index-btn",
    InsertActionType.InsertListIndexAccessor
);
InsertActionMap.set(InsertListAccessorAction.cssId, InsertListAccessorAction);

export const InsertListAppendCallAction = new InsertActionData(
    "add-list-append-stmt-btn",
    InsertActionType.InsertListAppendMethod
);
InsertActionMap.set(InsertListAppendCallAction.cssId, InsertListAppendCallAction);

export const InsertSplitCallAction = new InsertActionData(
    "add-split-method-call-btn",
    InsertActionType.InsertStringSplitMethod
);
InsertActionMap.set(InsertSplitCallAction.cssId, InsertSplitCallAction);

export const InsertJoinCallAction = new InsertActionData(
    "add-join-method-call-btn",
    InsertActionType.InsertStringJoinMethod
);
InsertActionMap.set(InsertJoinCallAction.cssId, InsertJoinCallAction);

export const InsertReplaceCallAction = new InsertActionData(
    "add-replace-method-call-btn",
    InsertActionType.InsertStringReplaceMethod
);
InsertActionMap.set(InsertReplaceCallAction.cssId, InsertReplaceCallAction);

export const InsertFindCallAction = new InsertActionData(
    "add-find-method-call-btn",
    InsertActionType.InsertStringFindMethod
);
InsertActionMap.set(InsertFindCallAction.cssId, InsertFindCallAction);

export const InsertStrCastAction = new InsertActionData("add-cast-str-btn", InsertActionType.InsertCastStrExpr);
InsertActionMap.set(InsertStrCastAction.cssId, InsertStrCastAction);
