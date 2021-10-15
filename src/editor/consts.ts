import * as AddVarDocs from "../docs/add-var.json";
import * as AddDocs from "../docs/add.json";
import * as AndDocs from "../docs/and.json";
import * as AssignAddDocs from "../docs/assign-add.json";
import * as AssignDivDocs from "../docs/assign-div.json";
import * as AssignMultDocs from "../docs/assign-mult.json";
import * as AssignSubDocs from "../docs/assign-sub.json";
import * as AssignDocs from "../docs/assign.json";
import * as CompEqDocs from "../docs/comp-eq.json";
import * as CompGtDocs from "../docs/comp-gt.json";
import * as CompGteDocs from "../docs/comp-gte.json";
import * as CompLtDocs from "../docs/comp-lt.json";
import * as CompLteDocs from "../docs/comp-lte.json";
import * as CompNeDocs from "../docs/comp-ne.json";
import * as DivDocs from "../docs/div.json";
import * as ElifDocs from "../docs/elif.json";
import * as ElseDocs from "../docs/else.json";
import * as FalseDocs from "../docs/false.json";
import * as FindDocs from "../docs/find.json";
import * as ForDocs from "../docs/for.json";
import * as IfDocs from "../docs/if.json";
import * as ImportDocs from "../docs/import.json";
import * as InputDocs from "../docs/input.json";
import * as JoinDocs from "../docs/join.json";
import * as LenDocs from "../docs/len.json";
import * as ListAppendDocs from "../docs/list-append.json";
import * as ListIndexDocs from "../docs/list-index.json";
import * as ListItemDocs from "../docs/list-item.json";
import * as ListLiteralDocs from "../docs/list-literal.json";
import * as MultDocs from "../docs/mult.json";
import * as NotDocs from "../docs/not.json";
import * as NumDocs from "../docs/num.json";
import * as OrDocs from "../docs/or.json";
import * as PrintDocs from "../docs/print.json";
import * as RandintDocs from "../docs/randint.json";
import * as RangeDocs from "../docs/range.json";
import * as ReplaceDocs from "../docs/replace.json";
import * as SplitDocs from "../docs/split.json";
import * as StrDocs from "../docs/str.json";
import * as SubDocs from "../docs/sub.json";
import * as CastToStrDocs from "../docs/to-str.json";
import * as TrueDocs from "../docs/true.json";
import * as WhileDocs from "../docs/while.json";
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
    ImportStatement,
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
import {
    AugmentedAssignmentOperator,
    BinaryOperator,
    DataType,
    IdentifierRegex,
    NumberRegex,
    UnaryOp,
} from "../syntax-tree/consts";
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
    DeleteBackMultiLines,
    DeleteCurLine,
    DeleteStatement,
    DeleteSelectedModifier,

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
    InsertImportFromDraftMode,
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
    InsertImportStmt,

    InsertPrintFunctionStmt,
    InsertRandintExpr,
    InsertRangeExpr,
    InsertLenExpr,
    InsertCastStrExpr,
    InsertInputExpr,

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
    toolboxCategories: Array<ToolboxCategory> = [];

    private constructor() {
        const PrintStmt = new EditCodeAction(
            "print(---)",
            "add-print-btn",
            () => new FunctionCallStmt("print", [new Argument([DataType.Any], "item", false)]),
            InsertActionType.InsertPrintFunctionStmt,
            {},
            PrintDocs,
            ["("],
            "print",
            null
        );

        const RandIntExpr = new EditCodeAction(
            "randint(---, ---)",
            "add-randint-btn",
            () =>
                new FunctionCallExpr(
                    "randint",
                    [new Argument([DataType.Number], "start", false), new Argument([DataType.Number], "end", false)],
                    DataType.Number,
                    null,
                    null,
                    "random"
                ),
            InsertActionType.InsertRandintExpr,
            {},
            RandintDocs,
            ["("],
            "randint",
            null
        );

        const RangeExpr = new EditCodeAction(
            "range(---, ---)",
            "add-range-btn",
            () =>
                new FunctionCallExpr(
                    "range",
                    [new Argument([DataType.Number], "start", false), new Argument([DataType.Number], "end", false)],
                    DataType.NumberList
                ),
            InsertActionType.InsertRangeExpr,
            {},
            RangeDocs,
            ["("],
            "range",
            null
        );

        const LenExpr = new EditCodeAction(
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
            LenDocs,
            ["("],
            "len",
            null
        );

        const InputExpr = new EditCodeAction(
            "input(---)",
            "add-input-btn",
            () => new FunctionCallExpr("input", [new Argument([DataType.String], "prompt", true)], DataType.String),
            InsertActionType.InsertInputExpr,
            {},
            InputDocs,
            ["("],
            "input",
            null
        );

        const StringLiteralExpr = new EditCodeAction(
            '""',
            "add-str-btn",
            () => new LiteralValExpr(DataType.String, ""),
            InsertActionType.InsertLiteral,
            {
                literalType: DataType.String,
                initialValue: "",
            },
            StrDocs,
            [],
            "",
            null
        );

        const NumberLiteralExpr = new EditCodeAction(
            "0",
            "add-num-btn",
            () => new LiteralValExpr(DataType.Number, "0"),
            InsertActionType.InsertLiteral,
            {
                literalType: DataType.Number,
                initialValue: "0",
            },
            NumDocs,
            [],
            "",
            null
        );

        const BooleanTrueLiteralExpr = new EditCodeAction(
            "True",
            "add-true-btn",
            () => new LiteralValExpr(DataType.Boolean, "True"),
            InsertActionType.InsertLiteral,
            {
                literalType: DataType.Boolean,
                initialValue: "True",
            },
            TrueDocs,
            [" "],
            "True",
            null,
            [new RegExp("^[\\=\\!\\ ]$")]
        );

        const BooleanFalseLiteralExpr = new EditCodeAction(
            "False",
            "add-false-btn",
            () => new LiteralValExpr(DataType.Boolean, "False"),
            InsertActionType.InsertLiteral,
            {
                literalType: DataType.Boolean,
                initialValue: "False",
            },
            FalseDocs,
            [" "],
            "False",
            null,
            [new RegExp("^[\\=\\!\\ ]$")]
        );

        const BinAddExpr = new EditCodeAction(
            "--- + ---",
            "add-bin-add-expr-btn",
            () => new BinaryOperatorExpr(BinaryOperator.Add, DataType.Number), //NOTE: For + this will be reassigned in the constructor
            InsertActionType.InsertBinaryExpr,
            {
                operator: BinaryOperator.Add,
            },
            AddDocs,
            ["+"],
            "",
            null
        );

        const BinSubExpr = new EditCodeAction(
            "--- - ---",
            "add-bin-sub-expr-btn",
            () => new BinaryOperatorExpr(BinaryOperator.Subtract, DataType.Number),
            InsertActionType.InsertBinaryExpr,
            {
                operator: BinaryOperator.Subtract,
            },
            SubDocs,
            ["-"],
            "",
            null
        );

        const BinMultExpr = new EditCodeAction(
            "--- * ---",
            "add-bin-mul-expr-btn",
            () => new BinaryOperatorExpr(BinaryOperator.Multiply, DataType.Number),
            InsertActionType.InsertBinaryExpr,
            {
                operator: BinaryOperator.Multiply,
            },
            MultDocs,
            ["*"],
            "",
            null
        );

        const BinDivExpr = new EditCodeAction(
            "--- / ---",
            "add-bin-div-expr-btn",
            () => new BinaryOperatorExpr(BinaryOperator.Divide, DataType.Number),
            InsertActionType.InsertBinaryExpr,
            {
                operator: BinaryOperator.Divide,
            },
            DivDocs,
            ["/"],
            "",
            null
        );

        const BinAndExpr = new EditCodeAction(
            "--- and ---",
            "add-bin-and-expr-btn",
            () => new BinaryOperatorExpr(BinaryOperator.And, DataType.Boolean),
            InsertActionType.InsertBinaryExpr,
            {
                operator: BinaryOperator.And,
            },
            AndDocs,
            ["d"],
            "an",
            null
        );

        const BinOrExpr = new EditCodeAction(
            "--- or ---",
            "add-bin-or-expr-btn",
            () => new BinaryOperatorExpr(BinaryOperator.Or, DataType.Boolean),
            InsertActionType.InsertBinaryExpr,
            {
                operator: BinaryOperator.Or,
            },
            OrDocs,
            ["r"],
            "o",
            null
        );

        const BinCompEqExpr = new EditCodeAction(
            "--- == ---",
            "add-comp-eq-expr-btn",
            () => new BinaryOperatorExpr(BinaryOperator.Equal, DataType.Boolean),
            InsertActionType.InsertBinaryExpr,
            {
                operator: BinaryOperator.Equal,
            },
            CompEqDocs,
            ["="],
            "=",
            null
        );

        const BinCompNeqExpr = new EditCodeAction(
            "--- != ---",
            "add-comp-neq-expr-btn",
            () => new BinaryOperatorExpr(BinaryOperator.NotEqual, DataType.Boolean),
            InsertActionType.InsertBinaryExpr,
            {
                operator: BinaryOperator.NotEqual,
            },
            CompNeDocs,
            ["="],
            "!",
            null
        );

        const BinCompLtExpr = new EditCodeAction(
            "--- < ---",
            "add-comp-lt-expr-btn",
            () => new BinaryOperatorExpr(BinaryOperator.LessThan, DataType.Boolean),
            InsertActionType.InsertBinaryExpr,
            {
                operator: BinaryOperator.LessThan,
            },
            CompLtDocs,
            [" "],
            "<",
            null,
            [IdentifierRegex, NumberRegex, new RegExp('^[\\"]$')]
        );

        const BinCompLteExpr = new EditCodeAction(
            "--- <= ---",
            "add-comp-lte-expr-btn",
            () => new BinaryOperatorExpr(BinaryOperator.LessThanEqual, DataType.Boolean),
            InsertActionType.InsertBinaryExpr,
            {
                operator: BinaryOperator.LessThanEqual,
            },
            CompLteDocs,
            ["="],
            "<",
            null
        );

        const BinCompGtExpr = new EditCodeAction(
            "--- > ---",
            "add-comp-gt-expr-btn",
            () => new BinaryOperatorExpr(BinaryOperator.GreaterThan, DataType.Boolean),
            InsertActionType.InsertBinaryExpr,
            {
                operator: BinaryOperator.GreaterThan,
            },
            CompGtDocs,
            [" "],
            ">",
            null,
            [IdentifierRegex, NumberRegex, new RegExp('^[\\"]$')]
        );

        const BinCompGteExpr = new EditCodeAction(
            "--- >= ---",
            "add-comp-gte-expr-btn",
            () => new BinaryOperatorExpr(BinaryOperator.GreaterThanEqual, DataType.Boolean),
            InsertActionType.InsertBinaryExpr,
            {
                operator: BinaryOperator.GreaterThanEqual,
            },
            CompGteDocs,
            ["="],
            ">",
            null
        );

        const UnaryNotExpr = new EditCodeAction(
            "not ---",
            "add-unary-not-expr-btn",
            () => new UnaryOperatorExpr(UnaryOp.Not, DataType.Boolean),
            InsertActionType.InsertUnaryExpr,
            {
                operator: UnaryOp.Not,
            },
            NotDocs,
            // TODO: this has ambiguity with not in binary exp
            ["t"],
            "no",
            null
        );

        const FindMethodMod = new EditCodeAction(
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
            FindDocs,
            ["("],
            ".find",
            null
        );

        const WhileStmt = new EditCodeAction(
            "while (---) :",
            "add-while-expr-btn",
            () => new WhileStatement(),
            InsertActionType.InsertWhileStmt,
            {},
            WhileDocs,
            [" "],
            "while",
            null
        );

        const IfStmt = new EditCodeAction(
            "if (---) :",
            "add-if-expr-btn",
            () => new IfStatement(),
            InsertActionType.InsertIfStmt,
            {},
            IfDocs,
            [" "],
            "if",
            null
        );

        const ElifStmt = new EditCodeAction(
            "elif (---) :",
            "add-elif-expr-btn",
            () => new ElseStatement(true),
            InsertActionType.InsertElifStmt,
            {},
            ElifDocs,
            [" "],
            "elif",
            null
        );

        const ElseStmt = new EditCodeAction(
            "else :",
            "add-else-expr-btn",
            () => new ElseStatement(false),
            InsertActionType.InsertElseStmt,
            {},
            ElseDocs,
            [" "],
            "else",
            null
        );

        const ForStmt = new EditCodeAction(
            "for -- in --- :",
            "add-for-expr-btn",
            () => new ForStatement(),
            InsertActionType.InsertForStmt,
            {},
            ForDocs,
            [" "],
            "for",
            null
        );

        const ImportStmt = new EditCodeAction(
            "from --- import --- :",
            "add-import-btn",
            () => new ImportStatement(),
            InsertActionType.InsertImportStmt,
            {},
            ImportDocs,
            [" "],
            "import",
            null
        );

        const ListLiteralExpr = new EditCodeAction(
            "[]",
            "add-list-literal-btn",
            () => new ListLiteralExpression(),
            InsertActionType.InsertListLiteral,
            {},
            ListLiteralDocs,
            ["["],
            "",
            null
        );

        const ListCommaItem = new EditCodeAction(
            ", ---",
            "add-list-item-btn",
            () => new ListComma(),
            InsertActionType.InsertListItem,
            {},
            ListItemDocs,
            [","],
            "",
            null
        );

        const ListIndexAccessor = new EditCodeAction(
            "[---]",
            "add-list-index-btn",
            () => new ListAccessModifier(),
            InsertActionType.InsertListIndexAccessor,
            {},
            ListIndexDocs,
            ["["],
            "",
            null
        );

        const AssignmentMod = new EditCodeAction(
            "= ---",
            "add-assign-mod-btn",
            () => new AssignmentModifier(),
            InsertActionType.InsertAssignmentModifier,
            {},
            AssignDocs,
            ["="],
            "",
            null
        );

        const AugAddAssignmentMod = new EditCodeAction(
            "+= ---",
            "add-aug-assign-add-mod-btn",
            () => new AugmentedAssignmentModifier(AugmentedAssignmentOperator.Add),
            InsertActionType.InsertAugmentedAssignmentModifier,
            {},
            AssignAddDocs,
            ["+"],
            "",
            null
        );

        const AugSubAssignmentMod = new EditCodeAction(
            "-= ---",
            "add-aug-assign-sub-mod-btn",
            () => new AugmentedAssignmentModifier(AugmentedAssignmentOperator.Subtract),
            InsertActionType.InsertAugmentedAssignmentModifier,
            {},
            AssignSubDocs,
            ["-"],
            "",
            null
        );

        const AugMulAssignmentMod = new EditCodeAction(
            "*= ---",
            "add-aug-assign-mul-mod-btn",
            () => new AugmentedAssignmentModifier(AugmentedAssignmentOperator.Multiply),
            InsertActionType.InsertAugmentedAssignmentModifier,
            {},
            AssignMultDocs,
            ["*"],
            "",
            null
        );

        const AugDivAssignmentMod = new EditCodeAction(
            "/= ---",
            "add-aug-assign-div-mod-btn",
            () => new AugmentedAssignmentModifier(AugmentedAssignmentOperator.Divide),
            InsertActionType.InsertAugmentedAssignmentModifier,
            {},
            AssignDivDocs,
            ["/"],
            "",
            null
        );

        const AppendMethodMod = new EditCodeAction(
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
            ListAppendDocs,
            ["("],
            ".append",
            null
        );

        const ReplaceMethodMod = new EditCodeAction(
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
            ReplaceDocs,
            ["("],
            ".replace",
            null
        );

        const JoinMethodMod = new EditCodeAction(
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
            JoinDocs,
            ["("],
            ".join",
            null
        );

        const SplitMethodMod = new EditCodeAction(
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
            SplitDocs,
            ["("],
            ".split",
            null
        );

        const CastStrExpr = new EditCodeAction(
            "str(---)",
            "add-cast-str-btn",
            () => new FunctionCallExpr("str", [new Argument([DataType.Any], "value", false)], DataType.String),
            InsertActionType.InsertCastStrExpr,
            {},
            CastToStrDocs,
            ["("],
            "str",
            null
        );

        const VarAssignStmt = new EditCodeAction(
            "var = ---",
            "add-var-btn",
            () => new VarAssignmentStmt(),
            InsertActionType.InsertNewVariableStmt,
            {},
            AddVarDocs,
            ["="],
            null,
            IdentifierRegex
        );

        this.actionsList = new Array<EditCodeAction>(
            PrintStmt,
            RandIntExpr,
            RangeExpr,
            LenExpr,
            InputExpr,
            StringLiteralExpr,
            NumberLiteralExpr,
            BooleanTrueLiteralExpr,
            BooleanFalseLiteralExpr,
            BinAddExpr,
            BinSubExpr,
            BinMultExpr,
            BinDivExpr,
            BinAndExpr,
            BinOrExpr,
            BinCompEqExpr,
            BinCompNeqExpr,
            BinCompLtExpr,
            BinCompLteExpr,
            BinCompGtExpr,
            BinCompGteExpr,
            UnaryNotExpr,
            FindMethodMod,
            WhileStmt,
            IfStmt,
            ElifStmt,
            ElseStmt,
            ForStmt,
            ImportStmt,
            ListLiteralExpr,
            ListCommaItem,
            ListIndexAccessor,
            AssignmentMod,
            AugAddAssignmentMod,
            AugSubAssignmentMod,
            AugMulAssignmentMod,
            AugDivAssignmentMod,
            AppendMethodMod,
            ReplaceMethodMod,
            JoinMethodMod,
            SplitMethodMod,
            CastStrExpr,
            VarAssignStmt
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
                    () => new ForStatement(),
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
                    () => new VarAssignmentStmt(),
                    () => new ForStatement(),
                    () => new ValueOperationExpr(null, [new ListAccessModifier()]),
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
                    () => new VarAssignmentStmt(),
                    () => new ForStatement(),
                    () => new ValueOperationExpr(null, [new ListAccessModifier()]),
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
                    () => new VarAssignmentStmt(),
                    () => new ForStatement(),
                    () => new ValueOperationExpr(null, [new ListAccessModifier()]),
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
                    () => new VarAssignmentStmt(),
                    () => new ForStatement(),
                    () => new ValueOperationExpr(null, [new ListAccessModifier()]),
                ],
            ],
        ]);

        this.toolboxCategories.push(
            new ToolboxCategory("Loops", "loops-toolbox-group", [WhileStmt, ForStmt, RangeExpr])
        );
        this.toolboxCategories.push(
            new ToolboxCategory("Conditionals", "conditionals-toolbox-group", [IfStmt, ElifStmt, ElseStmt])
        );
        this.toolboxCategories.push(
            new ToolboxCategory("Functions", "functions-toolbox-group", [PrintStmt, InputExpr, LenExpr])
        );
        this.toolboxCategories.push(
            new ToolboxCategory("Variables", "create-var-toolbox-group", [
                VarAssignStmt,
                AssignmentMod,
                AugAddAssignmentMod,
                AugSubAssignmentMod,
                AugMulAssignmentMod,
                AugDivAssignmentMod,
            ])
        );
        this.toolboxCategories.push(
            new ToolboxCategory("Numbers", "numbers-toolbox-group", [NumberLiteralExpr, RandIntExpr])
        );
        this.toolboxCategories.push(
            new ToolboxCategory("Texts", "text-toolbox-group", [
                StringLiteralExpr,
                SplitMethodMod,
                JoinMethodMod,
                FindMethodMod,
                ReplaceMethodMod,
            ])
        );
        this.toolboxCategories.push(
            new ToolboxCategory("Lists", "list-ops-toolbox-group", [
                ListLiteralExpr,
                ListCommaItem,
                ListIndexAccessor,
                AppendMethodMod,
            ])
        );

        this.toolboxCategories.push(
            new ToolboxCategory("Arithmetics", "arithmetics-toolbox-group", [
                BinAddExpr,
                BinSubExpr,
                BinMultExpr,
                BinDivExpr,
            ])
        );
        this.toolboxCategories.push(
            new ToolboxCategory("Comparisons", "comparison-ops-toolbox-group", [
                BinCompEqExpr,
                BinCompNeqExpr,
                BinCompLtExpr,
                BinCompLteExpr,
                BinCompGtExpr,
                BinCompGteExpr,
            ])
        );
        this.toolboxCategories.push(
            new ToolboxCategory("Booleans", "boolean-ops-toolbox-group", [
                BinAndExpr,
                BinOrExpr,
                UnaryNotExpr,
                BooleanTrueLiteralExpr,
                BooleanFalseLiteralExpr,
            ])
        );
        this.toolboxCategories.push(new ToolboxCategory("Casting", "casting-toolbox-group", [CastStrExpr]));
        this.toolboxCategories.push(new ToolboxCategory("Imports", "import-ops-toolbox-group", [ImportStmt]));
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

export class ToolboxCategory {
    displayName: string;
    id: string;
    items: Array<EditCodeAction> = [];

    constructor(displayName: string, id: string, items: Array<EditCodeAction>) {
        this.displayName = displayName;
        this.id = id;
        this.items = items;
    }
}
