import {
    Argument,
    AssignmentModifier,
    AugmentedAssignmentModifier,
    BinaryOperatorExpr,
    ElseStatement,
    ForStatement,
    FunctionCallExpr,
    FunctionCallStmt,
    IfStatement,
    ListAccessModifier,
    ListComma,
    ListLiteralExpression,
    LiteralValExpr,
    MethodCallModifier,
    Statement,
    UnaryOperatorExpr,
    ValueOperationExpr,
    VarAssignmentStmt,
    VarOperationStmt,
    WhileStatement,
} from "../syntax-tree/ast";
import { AugmentedAssignmentOperator, BinaryOperator, DataType, IdentifierRegex, UnaryOp } from "../syntax-tree/consts";
import { EditCodeAction } from "./action-filter";

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
    InsertAssignmentModifier,

    OpenAutocomplete,
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

    InsertAssignmentModifier,
    InsertAugmentedAssignmentModifier,

    InsertVarOperationStmt,
    InsertValOperationExpr,
}

export class Actions {
    private static inst: Actions;
    actionsList: Array<EditCodeAction>;
    actionsMap: Map<string, EditCodeAction>;
    varModifiersMap: Map<DataType, Array<() => Statement>>;

    private constructor() {
        this.actionsList = new Array<EditCodeAction>(
            new EditCodeAction(
                "print(---)",
                "add-print-btn",
                () => new FunctionCallStmt("print", [new Argument([DataType.Any], "item", false)]),
                InsertActionType.InsertPrintFunctionStmt,
                {},
                ["("],
                "print"
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
                InsertActionType.InsertRandintExpr,
                {},
                ["("],
                "randint"
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
                InsertActionType.InsertRangeExpr,
                {},
                ["("],
                "range"
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
                InsertActionType.InsertLenExpr,
                {},
                ["("],
                "len"
            ),

            new EditCodeAction(
                '""',
                "add-str-btn",
                () => new LiteralValExpr(DataType.String, ""),
                InsertActionType.InsertLiteral,
                {
                    literalType: DataType.String,
                    initialValue: "",
                },
                [],
                ""
            ),
            new EditCodeAction(
                "0",
                "add-num-btn",
                () => new LiteralValExpr(DataType.Number, "0"),
                InsertActionType.InsertLiteral,
                {
                    literalType: DataType.Number,
                    initialValue: "0",
                },
                [],
                ""
            ),

            new EditCodeAction(
                "True",
                "add-true-btn",
                () => new LiteralValExpr(DataType.Boolean, "True"),
                InsertActionType.InsertLiteral,
                {
                    literalType: DataType.Boolean,
                    initialValue: "True",
                },
                ["e"],
                "Tru"
            ),

            new EditCodeAction(
                "False",
                "add-false-btn",
                () => new LiteralValExpr(DataType.Boolean, "False"),
                InsertActionType.InsertLiteral,
                {
                    literalType: DataType.Boolean,
                    initialValue: "False",
                },
                ["e"],
                "Fals"
            ),

            new EditCodeAction(
                "--- + ---",
                "add-bin-add-expr-btn",
                () => new BinaryOperatorExpr(BinaryOperator.Add, DataType.Number), //NOTE: For + this will be reassigned in the constructor
                InsertActionType.InsertBinaryExpr,
                {
                    operator: BinaryOperator.Add,
                },
                ["+"],
                ""
            ),

            new EditCodeAction(
                "--- - ---",
                "add-bin-sub-expr-btn",
                () => new BinaryOperatorExpr(BinaryOperator.Subtract, DataType.Number),
                InsertActionType.InsertBinaryExpr,
                {
                    operator: BinaryOperator.Subtract,
                },
                ["-"],
                ""
            ),

            new EditCodeAction(
                "--- * ---",
                "add-bin-mul-expr-btn",
                () => new BinaryOperatorExpr(BinaryOperator.Multiply, DataType.Number),
                InsertActionType.InsertBinaryExpr,
                {
                    operator: BinaryOperator.Multiply,
                },
                ["*"],
                ""
            ),

            new EditCodeAction(
                "--- / ---",
                "add-bin-div-expr-btn",
                () => new BinaryOperatorExpr(BinaryOperator.Divide, DataType.Number),
                InsertActionType.InsertBinaryExpr,
                {
                    operator: BinaryOperator.Divide,
                },
                ["/"],
                ""
            ),

            new EditCodeAction(
                "--- and ---",
                "add-bin-and-expr-btn",
                () => new BinaryOperatorExpr(BinaryOperator.And, DataType.Boolean),
                InsertActionType.InsertBinaryExpr,
                {
                    operator: BinaryOperator.And,
                },
                ["d"],
                "an"
            ),

            new EditCodeAction(
                "--- or ---",
                "add-bin-or-expr-btn",
                () => new BinaryOperatorExpr(BinaryOperator.Or, DataType.Boolean),
                InsertActionType.InsertBinaryExpr,
                {
                    operator: BinaryOperator.Or,
                },
                ["r"],
                "o"
            ),

            new EditCodeAction(
                "--- == ---",
                "add-comp-eq-expr-btn",
                () => new BinaryOperatorExpr(BinaryOperator.Equal, DataType.Boolean),
                InsertActionType.InsertBinaryExpr,
                {
                    operator: BinaryOperator.Equal,
                },
                ["="],
                "="
            ),

            new EditCodeAction(
                "--- != ---",
                "add-comp-neq-expr-btn",
                () => new BinaryOperatorExpr(BinaryOperator.NotEqual, DataType.Boolean),
                InsertActionType.InsertBinaryExpr,
                {
                    operator: BinaryOperator.NotEqual,
                },
                ["="],
                "!"
            ),

            new EditCodeAction(
                "--- < ---",
                "add-comp-lt-expr-btn",
                () => new BinaryOperatorExpr(BinaryOperator.LessThan, DataType.Boolean),
                InsertActionType.InsertBinaryExpr,
                {
                    operator: BinaryOperator.LessThan,
                },
                [" "],
                "<"
            ),

            new EditCodeAction(
                "--- <= ---",
                "add-comp-lte-expr-btn",
                () => new BinaryOperatorExpr(BinaryOperator.LessThanEqual, DataType.Boolean),
                InsertActionType.InsertBinaryExpr,
                {
                    operator: BinaryOperator.LessThanEqual,
                },
                ["="],
                "<"
            ),

            new EditCodeAction(
                "--- > ---",
                "add-comp-gt-expr-btn",
                () => new BinaryOperatorExpr(BinaryOperator.GreaterThan, DataType.Boolean),
                InsertActionType.InsertBinaryExpr,
                {
                    operator: BinaryOperator.GreaterThan,
                },
                [" "],
                ">"
            ),

            new EditCodeAction(
                "--- >= ---",
                "add-comp-gte-expr-btn",
                () => new BinaryOperatorExpr(BinaryOperator.GreaterThanEqual, DataType.Boolean),
                InsertActionType.InsertBinaryExpr,
                {
                    operator: BinaryOperator.GreaterThanEqual,
                },
                ["="],
                ">"
            ),

            // TODO: this has ambiguity with not in binary exp
            new EditCodeAction(
                "not ---",
                "add-unary-not-expr-btn",
                () => new UnaryOperatorExpr(UnaryOp.Not, DataType.Boolean),
                InsertActionType.InsertUnaryExpr,
                {
                    operator: UnaryOp.Not,
                },
                ["t"],
                "no"
            ),

            new EditCodeAction(
                ".find(---)",
                "add-find-method-call-btn",
                () =>
                    new MethodCallModifier(
                        "find",
                        [new Argument([DataType.String], "item", false)],
                        DataType.Number,
                        DataType.String
                    ),
                InsertActionType.InsertStringFindMethod,
                {},
                ["("],
                ".find"
            ),

            new EditCodeAction(
                "while (---) :",
                "add-while-expr-btn",
                () => new WhileStatement(),
                InsertActionType.InsertWhileStmt,
                {},
                [" "],
                "while"
            ),

            new EditCodeAction(
                "if (---) :",
                "add-if-expr-btn",
                () => new IfStatement(),
                InsertActionType.InsertIfStmt,
                {},
                [" "],
                "if"
            ),

            new EditCodeAction(
                "elif (---) :",
                "add-elif-expr-btn",
                () => new ElseStatement(true),
                InsertActionType.InsertElifStmt,
                {},
                [" "],
                "elif"
            ),

            new EditCodeAction(
                "else (---) :",
                "add-else-expr-btn",
                () => new ElseStatement(false),
                InsertActionType.InsertElseStmt,
                {},
                [" "],
                "else"
            ),

            new EditCodeAction(
                "for --- in --- :",
                "add-for-expr-btn",
                () => new ForStatement(),
                InsertActionType.InsertForStmt,
                {},
                [" "],
                "for"
            ),

            new EditCodeAction(
                "[]",
                "add-list-literal-btn",
                () => new ListLiteralExpression(),
                InsertActionType.InsertListLiteral,
                {},
                ["["],
                ""
            ),

            new EditCodeAction(
                ", ---",
                "add-list-item-btn",
                () => new ListComma(),
                InsertActionType.InsertListItem,
                {},
                [","],
                ""
            ),

            new EditCodeAction(
                "[---]",
                "add-list-index-btn",
                () => new ListAccessModifier(),
                InsertActionType.InsertListIndexAccessor,
                {},
                ["["],
                ""
            ),

            new EditCodeAction(
                "= ---",
                "add-assign-mod-btn",
                () => new AssignmentModifier(),
                InsertActionType.InsertAssignmentModifier,
                {},
                ["="],
                ""
            ),

            new EditCodeAction(
                "+= ---",
                "add-aug-assign-add-mod-btn",
                () => new AugmentedAssignmentModifier(AugmentedAssignmentOperator.Add),
                InsertActionType.InsertAugmentedAssignmentModifier,
                {},
                ["+"],
                ""
            ),

            new EditCodeAction(
                "-= ---",
                "add-aug-assign-sub-mod-btn",
                () => new AugmentedAssignmentModifier(AugmentedAssignmentOperator.Subtract),
                InsertActionType.InsertAugmentedAssignmentModifier,
                {},
                ["-"],
                ""
            ),

            new EditCodeAction(
                "*= ---",
                "add-aug-assign-mul-mod-btn",
                () => new AugmentedAssignmentModifier(AugmentedAssignmentOperator.Multiply),
                InsertActionType.InsertAugmentedAssignmentModifier,
                {},
                ["*"],
                ""
            ),

            new EditCodeAction(
                "/= ---",
                "add-aug-assign-div-mod-btn",
                () => new AugmentedAssignmentModifier(AugmentedAssignmentOperator.Divide),
                InsertActionType.InsertAugmentedAssignmentModifier,
                {},
                ["/"],
                ""
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
                InsertActionType.InsertListAppendMethod,
                {},
                ["("],
                ".append"
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
                InsertActionType.InsertStringReplaceMethod,
                {},
                ["("],
                ".replace"
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
                },
                ["("],
                ".join"
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
                InsertActionType.InsertStringSplitMethod,
                {},
                ["("],
                ".split"
            ),

            new EditCodeAction(
                "str(---)",
                "add-cast-str-btn",
                () => new FunctionCallExpr("str", [new Argument([DataType.Any], "value", false)], DataType.String),
                InsertActionType.InsertCastStrExpr,
                {},
                ["("],
                "str"
            ),
            new EditCodeAction(
                "var = ---",
                "add-var-btn",
                () => new VarAssignmentStmt(),
                InsertActionType.InsertNewVariableStmt,
                {},
                ["="],
                null,
                IdentifierRegex
            )
        );

        this.actionsMap = new Map<string, EditCodeAction>(this.actionsList.map((action) => [action.cssId, action]));

        this.varModifiersMap = new Map<DataType, Array<() => Statement>>([
            [DataType.Boolean, [() => new VarAssignmentStmt()]],
            [
                DataType.Number,
                [
                    () => new VarAssignmentStmt(),
                    () =>
                        new VarOperationStmt(null, [new AugmentedAssignmentModifier(AugmentedAssignmentOperator.Add)]),
                    () =>
                        new VarOperationStmt(null, [
                            new AugmentedAssignmentModifier(AugmentedAssignmentOperator.Subtract),
                        ]),
                    () =>
                        new VarOperationStmt(null, [
                            new AugmentedAssignmentModifier(AugmentedAssignmentOperator.Multiply),
                        ]),
                    () =>
                        new VarOperationStmt(null, [
                            new AugmentedAssignmentModifier(AugmentedAssignmentOperator.Divide),
                        ]),
                ],
            ],
            [
                DataType.String,
                [
                    () => new VarAssignmentStmt(),
                    () =>
                        new VarOperationStmt(null, [new AugmentedAssignmentModifier(AugmentedAssignmentOperator.Add)]),

                    () =>
                        new ValueOperationExpr(null, [
                            new MethodCallModifier(
                                "split",
                                [new Argument([DataType.String], "sep", false)],
                                DataType.StringList,
                                DataType.String
                            ),
                        ]),
                    () =>
                        new ValueOperationExpr(null, [
                            new MethodCallModifier(
                                "join",
                                [
                                    new Argument(
                                        [
                                            DataType.AnyList,
                                            DataType.StringList,
                                            DataType.NumberList,
                                            DataType.BooleanList,
                                        ],
                                        "items",
                                        false
                                    ),
                                ],
                                DataType.String,
                                DataType.String
                            ),
                        ]),
                    () =>
                        new ValueOperationExpr(null, [
                            new MethodCallModifier(
                                "replace",
                                [
                                    new Argument([DataType.String], "old", false),
                                    new Argument([DataType.String], "new", false),
                                ],
                                DataType.String,
                                DataType.String
                            ),
                        ]),
                    () =>
                        new ValueOperationExpr(null, [
                            new MethodCallModifier(
                                "find",
                                [new Argument([DataType.String], "item", false)],
                                DataType.Number,
                                DataType.String
                            ),
                        ]),
                ],
            ],
            [
                DataType.AnyList,
                [
                    () => new VarOperationStmt(null, [new ListAccessModifier(), new AssignmentModifier()]),
                    () =>
                        new ValueOperationExpr(null, [
                            new MethodCallModifier(
                                "append",
                                [new Argument([DataType.Any], "object", false)],
                                DataType.Void,
                                DataType.AnyList
                            ),
                        ]),
                    () => new ValueOperationExpr(null, [new ListAccessModifier()]),
                    () => new VarAssignmentStmt(),
                ],
            ],
            [
                DataType.BooleanList,
                [
                    () => new VarOperationStmt(null, [new ListAccessModifier(), new AssignmentModifier()]),
                    () =>
                        new ValueOperationExpr(null, [
                            new MethodCallModifier(
                                "append",
                                [new Argument([DataType.Any], "object", false)],
                                DataType.Void,
                                DataType.AnyList
                            ),
                        ]),
                    () => new ValueOperationExpr(null, [new ListAccessModifier()]),
                    () => new VarAssignmentStmt(),
                ],
            ],
            [
                DataType.NumberList,
                [
                    () => new VarOperationStmt(null, [new ListAccessModifier(), new AssignmentModifier()]),

                    () =>
                        new VarOperationStmt(null, [
                            new MethodCallModifier(
                                "append",
                                [new Argument([DataType.Any], "object", false)],
                                DataType.Void,
                                DataType.AnyList
                            ),
                        ]),
                    () => new ValueOperationExpr(null, [new ListAccessModifier()]),
                    () => new VarAssignmentStmt(),
                ],
            ],
            [
                DataType.StringList,
                [
                    () => new VarOperationStmt(null, [new ListAccessModifier(), new AssignmentModifier()]),
                    () =>
                        new ValueOperationExpr(null, [
                            new MethodCallModifier(
                                "append",
                                [new Argument([DataType.Any], "object", false)],
                                DataType.Void,
                                DataType.AnyList
                            ),
                        ]),
                    () => new ValueOperationExpr(null, [new ListAccessModifier()]),
                    () => new VarAssignmentStmt(),
                ],
            ],
        ]);
    }

    static instance(): Actions {
        if (!Actions.inst) Actions.inst = new Actions();

        return Actions.inst;
    }
}

export enum CodeStatus {
    ContainsEmptyHoles,
    ContainsAutocompleteTkns,
    ContainsDraftMode,
    Empty,
    Runnable,
}
