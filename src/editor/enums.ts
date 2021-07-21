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

export enum ButtonPress {
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
    IndentForwards,

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
}
