import { BinaryOperator, DataType, UnaryOp } from "../syntax-tree/consts";
import { EditCodeAction } from "./action-filter";
import {
    Argument,
    BinaryOperatorExpr,
    ElseStatement,
    ForStatement,
    FunctionCallExpr,
    FunctionCallStmt,
    IfStatement,
    ListComma,
    ListElementAssignment,
    ListLiteralExpression,
    LiteralValExpr,
    MemberCallStmt,
    MethodCallModifier,
    UnaryOperatorExpr,
    VarAssignmentStmt,
    WhileStatement,
} from "../syntax-tree/ast";

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
    InsertElseStatement,

    InsertModifier,
}

export enum ConstructName {
    VarAssignment = "VarAssignmentStmt",
    Default = "Default",
}

export enum InsertActionType {
    InsertNewVariableStmt,

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
export class Actions {
    private static inst: Actions;
    actionsList: Array<EditCodeAction>;
    actionsMap: Map<string, EditCodeAction>;

    private constructor() {
        this.actionsList = new Array<EditCodeAction>(
            new EditCodeAction(
                "var = ---",
                "add-var-btn",
                () => new VarAssignmentStmt(),
                InsertActionType.InsertNewVariableStmt
            ),

            new EditCodeAction(
                "---[---] = ---",
                "add-list-elem-assign-btn",
                () => new ListElementAssignment(),
                InsertActionType.InsertListIndexAssignment
            ),

            new EditCodeAction(
                "print()",
                "add-print-btn",
                () => new FunctionCallStmt("print", [new Argument([DataType.Any], "item", false)], DataType.Void),
                InsertActionType.InsertPrintFunctionStmt
            ),

            new EditCodeAction(
                "randint(---, ---)",
                "add-randint-btn",
                () =>
                    new FunctionCallExpr(
                        "randint",
                        [
                            new Argument([DataType.Number], "start", false),
                            new Argument([DataType.Number], "end", false),
                        ],
                        DataType.Number
                    ),
                InsertActionType.InsertRandintExpr
            ),

            new EditCodeAction(
                "range(---)",
                "add-range-btn",
                () =>
                    new FunctionCallExpr(
                        "range",
                        [
                            new Argument([DataType.Number], "start", false),
                            new Argument([DataType.Number], "end", false),
                        ],
                        DataType.NumberList
                    ),
                InsertActionType.InsertRangeExpr
            ),

            new EditCodeAction(
                "len(---)",
                "add-len-btn",
                () =>
                    new FunctionCallExpr(
                        "len",
                        [
                            new Argument(
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
                    ),
                InsertActionType.InsertLenExpr
            ),

            new EditCodeAction(
                '""',
                "add-str-btn",
                () => new LiteralValExpr(DataType.String, ""),
                InsertActionType.InsertLiteral,
                {
                    literalType: DataType.String,
                    initialValue: "",
                }
            ),
            new EditCodeAction(
                "0",
                "add-num-btn",
                () => new LiteralValExpr(DataType.Number, "0"),
                InsertActionType.InsertLiteral,
                {
                    literalType: DataType.Number,
                    initialValue: "0",
                }
            ),

            new EditCodeAction(
                "True",
                "add-true-btn",
                () => new LiteralValExpr(DataType.Boolean, "True"),
                InsertActionType.InsertLiteral,
                {
                    literalType: DataType.Boolean,
                    initialValue: "True",
                }
            ),

            new EditCodeAction(
                "False",
                "add-false-btn",
                () => new LiteralValExpr(DataType.Boolean, "False"),
                InsertActionType.InsertLiteral,
                {
                    literalType: DataType.Boolean,
                    initialValue: "False",
                }
            ),

            new EditCodeAction(
                "--- + ---",
                "add-bin-add-expr-btn",
                () => new BinaryOperatorExpr(BinaryOperator.Add, DataType.Number), //NOTE: For + this will be reassigned in the constructor
                InsertActionType.InsertBinaryExpr,
                {
                    operator: BinaryOperator.Add,
                }
            ),

            new EditCodeAction(
                "--- - ---",
                "add-bin-sub-expr-btn",
                () => new BinaryOperatorExpr(BinaryOperator.Subtract, DataType.Number),
                InsertActionType.InsertBinaryExpr,
                {
                    operator: BinaryOperator.Subtract,
                }
            ),

            new EditCodeAction(
                "--- * ---",
                "add-bin-mul-expr-btn",
                () => new BinaryOperatorExpr(BinaryOperator.Multiply, DataType.Number),
                InsertActionType.InsertBinaryExpr,
                {
                    operator: BinaryOperator.Multiply,
                }
            ),

            new EditCodeAction(
                "--- / ---",
                "add-bin-div-expr-btn",
                () => new BinaryOperatorExpr(BinaryOperator.Divide, DataType.Number),
                InsertActionType.InsertBinaryExpr,
                {
                    operator: BinaryOperator.Divide,
                }
            ),

            new EditCodeAction(
                "--- and ---",
                "add-bin-and-expr-btn",
                () => new BinaryOperatorExpr(BinaryOperator.And, DataType.Boolean),
                InsertActionType.InsertBinaryExpr,
                {
                    operator: BinaryOperator.And,
                }
            ),

            new EditCodeAction(
                "--- or ---",
                "add-bin-or-expr-btn",
                () => new BinaryOperatorExpr(BinaryOperator.Or, DataType.Boolean),
                InsertActionType.InsertBinaryExpr,
                {
                    operator: BinaryOperator.Or,
                }
            ),

            new EditCodeAction(
                "--- == ---",
                "add-comp-eq-expr-btn",
                () => new BinaryOperatorExpr(BinaryOperator.Equal, DataType.Boolean),
                InsertActionType.InsertBinaryExpr,
                {
                    operator: BinaryOperator.Equal,
                }
            ),

            new EditCodeAction(
                "--- != ---",
                "add-comp-neq-expr-btn",
                () => new BinaryOperatorExpr(BinaryOperator.NotEqual, DataType.Boolean),
                InsertActionType.InsertBinaryExpr,
                {
                    operator: BinaryOperator.NotEqual,
                }
            ),

            new EditCodeAction(
                "--- < ---",
                "add-comp-lt-expr-btn",
                () => new BinaryOperatorExpr(BinaryOperator.LessThan, DataType.Boolean),
                InsertActionType.InsertBinaryExpr,
                {
                    operator: BinaryOperator.LessThan,
                }
            ),

            new EditCodeAction(
                "--- <= ---",
                "add-comp-lte-expr-btn",
                () => new BinaryOperatorExpr(BinaryOperator.LessThanEqual, DataType.Boolean),
                InsertActionType.InsertBinaryExpr,
                {
                    operator: BinaryOperator.LessThanEqual,
                }
            ),

            new EditCodeAction(
                "--- > ---",
                "add-comp-gt-expr-btn",
                () => new BinaryOperatorExpr(BinaryOperator.GreaterThan, DataType.Boolean),
                InsertActionType.InsertBinaryExpr,
                {
                    operator: BinaryOperator.GreaterThan,
                }
            ),

            new EditCodeAction(
                "--- >= ---",
                "add-comp-gte-expr-btn",
                () => new BinaryOperatorExpr(BinaryOperator.GreaterThanEqual, DataType.Boolean),
                InsertActionType.InsertBinaryExpr,
                {
                    operator: BinaryOperator.GreaterThanEqual,
                }
            ),

            new EditCodeAction(
                "not ---",
                "add-unary-not-expr-btn",
                () => new UnaryOperatorExpr(UnaryOp.Not, DataType.Boolean),
                InsertActionType.InsertUnaryExpr,
                {
                    operator: UnaryOp.Not,
                }
            ),

            new EditCodeAction(
                ".find(---)",
                "add-find-method-call-btn",
                () =>
                    new MethodCallModifier(
                        "find",
                        [new Argument([DataType.String], "item", false)],
                        DataType.String,
                        DataType.String
                    ),
                InsertActionType.InsertStringFindMethod
            ),

            new EditCodeAction(
                "while (---) :",
                "add-while-expr-btn",
                () => new WhileStatement(),
                InsertActionType.InsertWhileStmt
            ),

            new EditCodeAction("if (---) :", "add-if-expr-btn", () => new IfStatement(), InsertActionType.InsertIfStmt),

            new EditCodeAction(
                "elif (---) :",
                "add-elif-expr-btn",
                () => new ElseStatement(true),
                InsertActionType.InsertElifStmt
            ),

            new EditCodeAction(
                "else (---) :",
                "add-else-expr-btn",
                () => new ElseStatement(false),
                InsertActionType.InsertElseStmt
            ),

            new EditCodeAction(
                "for --- in --- :",
                "add-for-expr-btn",
                () => new ForStatement(),
                InsertActionType.InsertForStmt
            ),

            new EditCodeAction(
                "[]",
                "add-list-literal-btn",
                () => new ListLiteralExpression(),
                InsertActionType.InsertListLiteral
            ),

            new EditCodeAction(", ---", "add-list-item-btn", () => new ListComma(), InsertActionType.InsertListItem),

            new EditCodeAction(
                "---[---] = ---",
                "add-list-index-btn",
                () => new MemberCallStmt(DataType.Any),
                InsertActionType.InsertListIndexAccessor
            ),

            new EditCodeAction(
                ".append(---)",
                "add-list-append-stmt-btn",
                () =>
                    new MethodCallModifier(
                        "append",
                        [new Argument([DataType.Any], "object", false)],
                        DataType.Void,
                        DataType.AnyList
                    ),
                InsertActionType.InsertListAppendMethod
            ),

            new EditCodeAction(
                ".replace(---, ---)",
                "add-replace-method-call-btn",
                () =>
                    new MethodCallModifier(
                        "replace",
                        [new Argument([DataType.String], "old", false), new Argument([DataType.String], "new", false)],
                        DataType.String,
                        DataType.String
                    ),
                InsertActionType.InsertStringReplaceMethod
            ),

            new EditCodeAction(
                ".join(---)",
                "add-join-method-call-btn",
                () =>
                    new MethodCallModifier(
                        "join",
                        [
                            new Argument(
                                [DataType.AnyList, DataType.StringList, DataType.NumberList, DataType.BooleanList],
                                "items",
                                false
                            ),
                        ],
                        DataType.String,

                        DataType.String
                    ),
                InsertActionType.InsertStringJoinMethod,
                {
                    functionName: "join",
                    returns: DataType.String,
                    args: [
                        new Argument(
                            [DataType.AnyList, DataType.StringList, DataType.NumberList, DataType.BooleanList],
                            "items",
                            false
                        ),
                    ],
                    exprType: DataType.String,
                }
            ),

            new EditCodeAction(
                ".split(---)",
                "add-split-method-call-btn",
                () =>
                    new MethodCallModifier(
                        "split",
                        [new Argument([DataType.String], "sep", false)],
                        DataType.StringList,
                        DataType.String
                    ),
                InsertActionType.InsertStringSplitMethod
            ),

            new EditCodeAction(
                "str(---)",
                "add-cast-str-btn",
                () => new FunctionCallExpr("str", [new Argument([DataType.Any], "value", false)], DataType.String),
                InsertActionType.InsertCastStrExpr
            )
        );

        this.actionsMap = new Map<string, EditCodeAction>(this.actionsList.map((action) => [action.cssId, action]));
    }

    static instance(): Actions {
        if (!Actions.inst) Actions.inst = new Actions();

        return Actions.inst;
    }
}
