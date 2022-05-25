import * as AddVarDocs from "../docs/add-var.json";
import * as AddDocs from "../docs/add.json";
import * as AndDocs from "../docs/and.json";
import * as AssignAddDocs from "../docs/assign-add.json";
import * as AssignDivDocs from "../docs/assign-div.json";
import * as AssignMultDocs from "../docs/assign-mult.json";
import * as AssignSubDocs from "../docs/assign-sub.json";
import * as AssignDocs from "../docs/assign.json";
import * as BreakDocs from "../docs/break.json";
import * as RandChoiceDocs from "../docs/choice.json";
import * as CompEqDocs from "../docs/comp-eq.json";
import * as CompGtDocs from "../docs/comp-gt.json";
import * as CompGteDocs from "../docs/comp-gte.json";
import * as CompLtDocs from "../docs/comp-lt.json";
import * as CompLteDocs from "../docs/comp-lte.json";
import * as CompNeDocs from "../docs/comp-ne.json";
import * as DivDocs from "../docs/div.json";
import * as ElifDocs from "../docs/elif.json";
import * as ElseDocs from "../docs/else.json";
import * as FStringItemDocs from "../docs/f-str-item.json";
import * as FStringDocs from "../docs/f-str.json";
import * as FalseDocs from "../docs/false.json";
import * as FindDocs from "../docs/find.json";
import * as FloorDivDocs from "../docs/floor-div.json";
import * as ForDocs from "../docs/for.json";
import * as IfDocs from "../docs/if.json";
import * as ImportDocs from "../docs/import.json";
import * as InDocs from "../docs/in.json";
import * as InputDocs from "../docs/input.json";
import * as JoinDocs from "../docs/join.json";
import * as LenDocs from "../docs/len.json";
import * as ListAppendDocs from "../docs/list-append.json";
import * as ListIndexDocs from "../docs/list-index.json";
import * as ListItemDocs from "../docs/list-item.json";
import * as ListLiteralDocs from "../docs/list-literal.json";
import * as ModDocs from "../docs/mod.json";
import * as MultDocs from "../docs/mult.json";
import * as NotInDocs from "../docs/not-in.json";
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
import * as CastToIntDocs from "../docs/to-int.json";
import * as CastToStrDocs from "../docs/to-str.json";
import * as TrueDocs from "../docs/true.json";
import * as WhileDocs from "../docs/while.json";
import {
    Argument,
    AssignmentModifier,
    AugmentedAssignmentModifier,
    BinaryOperatorExpr,
    ElseStatement,
    FormattedStringCurlyBracketsExpr,
    FormattedStringExpr,
    ForStatement,
    FunctionCallExpr,
    FunctionCallStmt,
    IfStatement,
    ImportStatement,
    KeywordStmt,
    ListAccessModifier,
    ListComma,
    ListLiteralExpression,
    LiteralValExpr,
    MethodCallModifier,
    OperatorTkn,
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
    UnaryOperator,
} from "../syntax-tree/consts";
import { Module } from "../syntax-tree/module";
import { EditCodeAction } from "./action-filter";
import { Context } from "./focus";

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
    OpenCurlyBraces = "{",
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

    DoubleQuote = '"',
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
    DeleteRootNode,
    ReplaceExpressionWithItem,
    DeleteStringLiteral,

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
    DeleteMultiLineStatement,

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
    ConvertAutocompleteToString,

    InsertVarAssignStatement,
    InsertVariableRef,
    InsertElseStatement,

    InsertModifier,
    InsertAssignmentModifier,

    OpenAutocomplete,
    InsertImportFromDraftMode,

    InsertTypeCast,
    InsertComparisonConversion,
    InsertFunctionConversion,
    InsertMemberCallConversion,
    InsertMemberAccessConversion,

    InsertFormattedStringItem,
    DeleteFStringCurlyBrackets,

    InsertOperatorTkn,

    DeleteUnconvertibleOperandWarning,
}

export enum ConstructName {
    VarAssignment = "VarAssignmentStmt",
    Default = "Default",
}

export enum InsertActionType {
    InsertNewVariableStmt,

    InsertStatement,
    InsertExpression,
    InsertElifStmt,
    InsertElseStmt,

    InsertFormattedStringItem,
    InsertPrintFunctionStmt,
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

    InsertOperatorTkn,
}

export const Docs: any = {
    AddVarDocs,
    AddDocs,
    AndDocs,
    AssignAddDocs,
    AssignDivDocs,
    AssignMultDocs,
    AssignSubDocs,
    AssignDocs,
    BreakDocs,
    RandChoiceDocs,
    CompEqDocs,
    CompGtDocs,
    CompGteDocs,
    CompLtDocs,
    CompLteDocs,
    CompNeDocs,
    DivDocs,
    ElifDocs,
    ElseDocs,
    FStringItemDocs,
    FStringDocs,
    FalseDocs,
    FindDocs,
    FloorDivDocs,
    ForDocs,
    IfDocs,
    ImportDocs,
    InDocs,
    InputDocs,
    JoinDocs,
    LenDocs,
    ListAppendDocs,
    ListIndexDocs,
    ListItemDocs,
    ListLiteralDocs,
    ModDocs,
    MultDocs,
    NotInDocs,
    NotDocs,
    NumDocs,
    OrDocs,
    PrintDocs,
    RandintDocs,
    RangeDocs,
    ReplaceDocs,
    SplitDocs,
    StrDocs,
    SubDocs,
    CastToIntDocs,
    CastToStrDocs,
    TrueDocs,
    WhileDocs,
};

export class Actions {
    private static inst: Actions;
    actionsList: Array<EditCodeAction>;
    actionsMap: Map<string, EditCodeAction>;
    varActionsMap: Map<DataType, Array<VarAction>>;
    toolboxCategories: Array<ToolboxCategory> = [];

    private constructor() {
        const PrintStmt = new EditCodeAction(
            "print(---)",
            "add-print-btn",
            () =>
                new FunctionCallStmt(PrintDocs.styles.backgroundColor, "print", [
                    new Argument([DataType.Any], "item", false),
                ]),
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
                    RandintDocs.styles.backgroundColor,
                    "randint",
                    [new Argument([DataType.Number], "start", false), new Argument([DataType.Number], "end", false)],
                    DataType.Number,
                    null,
                    null,
                    "random"
                ),
            InsertActionType.InsertExpression,
            {},
            RandintDocs,
            ["("],
            "randint",
            null
        );

        const RandChoiceExpr = new EditCodeAction(
            "choice(---)",
            "add-choice-btn",
            () =>
                new FunctionCallExpr(
                    RandChoiceDocs.styles.backgroundColor,
                    "choice",
                    [new Argument([DataType.AnyList], "choices", false)],
                    DataType.Any,
                    null,
                    null,
                    "random"
                ),
            InsertActionType.InsertExpression,
            {},
            RandChoiceDocs,
            ["("],
            "choice",
            null
        );

        const RangeExpr = new EditCodeAction(
            "range(---)",
            "add-range-btn",
            () =>
                new FunctionCallExpr(
                    RangeDocs.styles.backgroundColor,
                    "range",
                    [new Argument([DataType.Number], "end", false)],
                    DataType.NumberList
                ),
            InsertActionType.InsertExpression,
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
                    LenDocs.styles.backgroundColor,
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
            () =>
                new FunctionCallExpr(
                    InputDocs.styles.backgroundColor,
                    "input",
                    [new Argument([DataType.String], "prompt", true)],
                    DataType.String
                ),
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
            () => new LiteralValExpr(StrDocs.styles.backgroundColor, DataType.String, ""),
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

        const FormattedStringLiteralExpr = new EditCodeAction(
            "f''",
            "add-f-str-literal-btn",
            () => new FormattedStringExpr(FStringDocs.styles.backgroundColor, ""),
            InsertActionType.InsertExpression,
            {},
            FStringDocs,
            ["'"],
            "f",
            null
        );

        const FormattedStringItem = new EditCodeAction(
            "{}",
            "add-f-str-item-btn",
            () => new FormattedStringCurlyBracketsExpr(FStringDocs.styles.backgroundColor),
            InsertActionType.InsertFormattedStringItem,
            {},
            FStringItemDocs,
            ["{"],
            "",
            null
        );

        const NumberLiteralExpr = new EditCodeAction(
            "0",
            "add-num-btn",
            () => new LiteralValExpr(NumDocs.styles.backgroundColor, DataType.Number, "0"),
            InsertActionType.InsertExpression,
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
            () => new LiteralValExpr(TrueDocs.styles.backgroundColor, DataType.Boolean, "True"),
            InsertActionType.InsertExpression,
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
            () => new LiteralValExpr(FalseDocs.styles.backgroundColor, DataType.Boolean, "False"),
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
            () => new BinaryOperatorExpr(AddDocs.styles.backgroundColor, BinaryOperator.Add, DataType.Number), //NOTE: For + this will be reassigned in the constructor
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
            () => new BinaryOperatorExpr(SubDocs.styles.backgroundColor, BinaryOperator.Subtract, DataType.Number),
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
            () => new BinaryOperatorExpr(MultDocs.styles.backgroundColor, BinaryOperator.Multiply, DataType.Number),
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
            () => new BinaryOperatorExpr(DivDocs.styles.backgroundColor, BinaryOperator.Divide, DataType.Number),
            InsertActionType.InsertBinaryExpr,
            {
                operator: BinaryOperator.Divide,
            },
            DivDocs,
            [" "],
            "/",
            null
        );

        const BinFloorDivExpr = new EditCodeAction(
            "--- // ---",
            "add-bin-floor-div-expr-btn",
            () => new BinaryOperatorExpr(FloorDivDocs.styles.backgroundColor, BinaryOperator.FloorDiv, DataType.Number),
            InsertActionType.InsertBinaryExpr,
            {
                operator: BinaryOperator.FloorDiv,
            },
            FloorDivDocs,
            ["/"],
            "/",
            null
        );

        const BinModExpr = new EditCodeAction(
            "--- % ---",
            "add-bin-mod-expr-btn",
            () => new BinaryOperatorExpr(ModDocs.styles.backgroundColor, BinaryOperator.Mod, DataType.Number),
            InsertActionType.InsertBinaryExpr,
            {
                operator: BinaryOperator.Mod,
            },
            ModDocs,
            ["%"],
            "",
            null
        );

        const InOperatorTkn = new EditCodeAction(
            "in",
            "add-in-op-tkn-btn",
            () => new OperatorTkn(InDocs.styles.backgroundColor, BinaryOperator.In),
            InsertActionType.InsertOperatorTkn,
            {},
            InDocs,
            [" "],
            "in",
            null
        );

        const NotInOperatorTkn = new EditCodeAction(
            "not in",
            "add-not-in-op-tkn-btn",
            () => new OperatorTkn(NotInDocs.styles.backgroundColor, BinaryOperator.NotIn),
            InsertActionType.InsertOperatorTkn,
            {},
            NotInDocs,
            ["n"],
            "not i",
            null
        );

        const AddOperatorTkn = new EditCodeAction(
            "+",
            "add-add-op-tkn-btn",
            () => new OperatorTkn(AddDocs.styles.backgroundColor, BinaryOperator.Add),
            InsertActionType.InsertOperatorTkn,
            {},
            AddDocs,
            ["+"],
            "",
            null
        );

        const SubOperatorTkn = new EditCodeAction(
            "-",
            "add-sub-op-tkn-btn",
            () => new OperatorTkn(SubDocs.styles.backgroundColor, BinaryOperator.Subtract),
            InsertActionType.InsertOperatorTkn,
            {},
            SubDocs,
            ["-"],
            "",
            null
        );

        const MultOperatorTkn = new EditCodeAction(
            "*",
            "add-mult-op-tkn-btn",
            () => new OperatorTkn(MultDocs.styles.backgroundColor, BinaryOperator.Multiply),
            InsertActionType.InsertOperatorTkn,
            {},
            MultDocs,
            ["*"],
            "",
            null
        );

        const DivOperatorTkn = new EditCodeAction(
            "/",
            "add-div-op-tkn-btn",
            () => new OperatorTkn(DivDocs.styles.backgroundColor, BinaryOperator.Divide),
            InsertActionType.InsertOperatorTkn,
            {},
            DivDocs,
            [""],
            "/",
            null
        );

        const FloorDivOperatorTkn = new EditCodeAction(
            "//",
            "add-floor-div-op-tkn-btn",
            () => new OperatorTkn(FloorDivDocs.styles.backgroundColor, BinaryOperator.FloorDiv),
            InsertActionType.InsertOperatorTkn,
            {},
            FloorDivDocs,
            ["/"],
            "/",
            null
        );

        const ModOperatorTkn = new EditCodeAction(
            "%",
            "add-mod-op-tkn-btn",
            () => new OperatorTkn(ModDocs.styles.backgroundColor, BinaryOperator.Mod),
            InsertActionType.InsertOperatorTkn,
            {},
            ModDocs,
            ["%"],
            "",
            null
        );

        const BinAndExpr = new EditCodeAction(
            "--- and ---",
            "add-bin-and-expr-btn",
            () => new BinaryOperatorExpr(AndDocs.styles.backgroundColor, BinaryOperator.And, DataType.Boolean),
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
            () => new BinaryOperatorExpr(OrDocs.styles.backgroundColor, BinaryOperator.Or, DataType.Boolean),
            InsertActionType.InsertBinaryExpr,
            {
                operator: BinaryOperator.Or,
            },
            OrDocs,
            ["r"],
            "o",
            null
        );

        const AndOperatorTkn = new EditCodeAction(
            "and",
            "add-and-op-tkn-btn",
            () => new OperatorTkn(AndDocs.styles.backgroundColor, BinaryOperator.And),
            InsertActionType.InsertOperatorTkn,
            {},
            AndDocs,
            ["d"],
            "an",
            null
        );

        const OrOperatorTkn = new EditCodeAction(
            "or",
            "add-or-op-tkn-btn",
            () => new OperatorTkn(OrDocs.styles.backgroundColor, BinaryOperator.Or),
            InsertActionType.InsertOperatorTkn,
            {},
            OrDocs,
            ["r"],
            "o",
            null
        );

        const BinCompEqExpr = new EditCodeAction(
            "--- == ---",
            "add-comp-eq-expr-btn",
            () => new BinaryOperatorExpr(CompEqDocs.styles.backgroundColor, BinaryOperator.Equal, DataType.Boolean),
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
            () => new BinaryOperatorExpr(CompNeDocs.styles.backgroundColor, BinaryOperator.NotEqual, DataType.Boolean),
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
            () => new BinaryOperatorExpr(CompLtDocs.styles.backgroundColor, BinaryOperator.LessThan, DataType.Boolean),
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
            () =>
                new BinaryOperatorExpr(
                    CompLteDocs.styles.backgroundColor,
                    BinaryOperator.LessThanEqual,
                    DataType.Boolean
                ),
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
            () =>
                new BinaryOperatorExpr(CompGtDocs.styles.backgroundColor, BinaryOperator.GreaterThan, DataType.Boolean),
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
            () =>
                new BinaryOperatorExpr(
                    CompGteDocs.styles.backgroundColor,
                    BinaryOperator.GreaterThanEqual,
                    DataType.Boolean
                ),
            InsertActionType.InsertBinaryExpr,
            {
                operator: BinaryOperator.GreaterThanEqual,
            },
            CompGteDocs,
            ["="],
            ">",
            null
        );

        const EqOperatorTkn = new EditCodeAction(
            "==",
            "add-comp-eq-op-tkn-btn",
            () => new OperatorTkn(CompEqDocs.styles.backgroundColor, BinaryOperator.Equal),
            InsertActionType.InsertOperatorTkn,
            {},
            CompEqDocs,
            ["="],
            "=",
            null
        );

        const NeqOperatorTkn = new EditCodeAction(
            "!=",
            "add-comp-neq-op-tkn-btn",
            () => new OperatorTkn(CompNeDocs.styles.backgroundColor, BinaryOperator.NotEqual),
            InsertActionType.InsertOperatorTkn,
            {},
            CompNeDocs,
            ["="],
            "!",
            null
        );

        const GtOperatorTkn = new EditCodeAction(
            ">",
            "add-comp-gt-op-tkn-btn",
            () => new OperatorTkn(CompNeDocs.styles.backgroundColor, BinaryOperator.GreaterThan),
            InsertActionType.InsertOperatorTkn,
            {},
            CompNeDocs,
            [" "],
            ">",
            null
        );

        const LtOperatorTkn = new EditCodeAction(
            "<",
            "add-comp-lt-op-tkn-btn",
            () => new OperatorTkn(CompNeDocs.styles.backgroundColor, BinaryOperator.LessThan),
            InsertActionType.InsertOperatorTkn,
            {},
            CompNeDocs,
            [" "],
            "<",
            null
        );

        const GteOperatorTkn = new EditCodeAction(
            ">=",
            "add-comp-gte-op-tkn-btn",
            () => new OperatorTkn(CompNeDocs.styles.backgroundColor, BinaryOperator.GreaterThanEqual),
            InsertActionType.InsertOperatorTkn,
            {},
            CompNeDocs,
            ["="],
            ">",
            null
        );

        const LteOperatorTkn = new EditCodeAction(
            "<=",
            "add-comp-lte-op-tkn-btn",
            () => new OperatorTkn(CompNeDocs.styles.backgroundColor, BinaryOperator.LessThanEqual),
            InsertActionType.InsertOperatorTkn,
            {},
            CompNeDocs,
            ["="],
            "<",
            null
        );

        const BinInExpr = new EditCodeAction(
            "--- in ---",
            "add-bin-in-expr-btn",
            () => new BinaryOperatorExpr(InDocs.styles.backgroundColor, BinaryOperator.In, DataType.Boolean),
            InsertActionType.InsertBinaryExpr,
            {
                operator: BinaryOperator.In,
            },
            InDocs,
            [" "],
            "in",
            null
        );

        const BinNotInExpr = new EditCodeAction(
            "--- not in ---",
            "add-bin-not-in-expr-btn",
            () => new BinaryOperatorExpr(NotInDocs.styles.backgroundColor, BinaryOperator.NotIn, DataType.Boolean),
            InsertActionType.InsertBinaryExpr,
            {
                operator: BinaryOperator.NotIn,
            },
            NotInDocs,
            ["n"],
            "not i",
            null
        );

        const UnaryNotExpr = new EditCodeAction(
            "not ---",
            "add-unary-not-expr-btn",
            () => new UnaryOperatorExpr(NotDocs.styles.backgroundColor, UnaryOperator.Not, DataType.Boolean),
            InsertActionType.InsertUnaryExpr,
            {
                operator: UnaryOperator.Not,
            },
            NotDocs,
            // TODO: this has ambiguity with not in binary exp
            [" ", "("],
            "not",
            null
        );

        const FindMethodMod = new EditCodeAction(
            ".find(---)",
            "add-find-method-call-btn",
            () =>
                new MethodCallModifier(
                    FindDocs.styles.backgroundColor,
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
            "while --- :",
            "add-while-expr-btn",
            () => new WhileStatement(WhileDocs.styles.backgroundColor),
            InsertActionType.InsertStatement,
            {},
            WhileDocs,
            [" ", "("],
            "while",
            null
        );

        const BreakStmt = new EditCodeAction(
            "break",
            "add-break-stmt-btn",
            () =>
                new KeywordStmt(BreakDocs.styles.backgroundColor, "break", null, null, (context: Context) => {
                    let parent = context.lineStatement.rootNode as Statement | Module;

                    while (
                        !(parent instanceof WhileStatement) &&
                        !(parent instanceof ForStatement) &&
                        !(parent instanceof Module)
                    ) {
                        parent = parent.rootNode;
                    }

                    if (parent instanceof Module) return false;
                    else return true;
                }),
            InsertActionType.InsertStatement,
            {},
            BreakDocs,
            ["k"],
            "brea",
            null
        );

        const IfStmt = new EditCodeAction(
            "if --- :",
            "add-if-expr-btn",
            () => new IfStatement(IfDocs.styles.backgroundColor),
            InsertActionType.InsertStatement,
            {},
            IfDocs,
            [" ", "("],
            "if",
            null
        );

        const ElifStmt = new EditCodeAction(
            "elif --- :",
            "add-elif-expr-btn",
            () => new ElseStatement(ElifDocs.styles.backgroundColor, true),
            InsertActionType.InsertElifStmt,
            {},
            ElifDocs,
            [" ", "("],
            "elif",
            null
        );

        const ElseStmt = new EditCodeAction(
            "else :",
            "add-else-expr-btn",
            () => new ElseStatement(ElseDocs.styles.backgroundColor, false),
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
            () => new ForStatement(ForDocs.styles.backgroundColor),
            InsertActionType.InsertStatement,
            {},
            ForDocs,
            [" "],
            "for",
            null
        );

        const ImportStmt = new EditCodeAction(
            "from --- import ---",
            "add-import-btn",
            () => new ImportStatement(ImportDocs.styles.backgroundColor),
            InsertActionType.InsertStatement,
            {},
            ImportDocs,
            [" "],
            "import",
            null
        );

        const ImportRandintStmt = new EditCodeAction(
            "from random import randint",
            "add-import-randint-btn",
            () => new ImportStatement(ImportDocs.styles.backgroundColor, "random", "randint"),
            InsertActionType.InsertStatement,
            {},
            ImportDocs,
            ["t"],
            "from random import randin",
            null
        );

        const ImportChoiceStmt = new EditCodeAction(
            "from random import choice",
            "add-import-choice-btn",
            () => new ImportStatement(ImportDocs.styles.backgroundColor, "random", "choice"),
            InsertActionType.InsertStatement,
            {},
            ImportDocs,
            ["e"],
            "from random import choic",
            null
        );

        const ListLiteralExpr = new EditCodeAction(
            "[]",
            "add-list-literal-btn",
            () => new ListLiteralExpression(ListLiteralDocs.styles.backgroundColor),
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
            () => new ListComma(ListItemDocs.styles.backgroundColor),
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
            () => new ListAccessModifier(ListIndexDocs.styles.backgroundColor),
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
            () => new AssignmentModifier(AssignDocs.styles.backgroundColor),
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
            () =>
                new AugmentedAssignmentModifier(AssignAddDocs.styles.backgroundColor, AugmentedAssignmentOperator.Add),
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
            () =>
                new AugmentedAssignmentModifier(
                    AssignSubDocs.styles.backgroundColor,
                    AugmentedAssignmentOperator.Subtract
                ),
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
            () =>
                new AugmentedAssignmentModifier(
                    AssignMultDocs.styles.backgroundColor,
                    AugmentedAssignmentOperator.Multiply
                ),
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
            () =>
                new AugmentedAssignmentModifier(
                    AssignDivDocs.styles.backgroundColor,
                    AugmentedAssignmentOperator.Divide
                ),
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
                    ListAppendDocs.styles.backgroundColor,
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
                    ReplaceDocs.styles.backgroundColor,
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
                    JoinDocs.styles.backgroundColor,
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
                    SplitDocs.styles.backgroundColor,
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
            () =>
                new FunctionCallExpr(
                    CastToStrDocs.styles.backgroundColor,
                    "str",
                    [new Argument([DataType.Any], "value", false)],
                    DataType.String
                ),
            InsertActionType.InsertCastStrExpr,
            {},
            CastToStrDocs,
            ["("],
            "str",
            null
        );

        const CastIntExpr = new EditCodeAction(
            "int(---)",
            "add-cast-int-btn",
            () =>
                new FunctionCallExpr(
                    CastToIntDocs.styles.backgroundColor,
                    "int",
                    [new Argument([DataType.String], "value", false)],
                    DataType.Number
                ),
            InsertActionType.InsertCastStrExpr,
            {},
            CastToIntDocs,
            ["("],
            "int",
            null
        );

        const VarAssignStmt = new EditCodeAction(
            "var = ---",
            "add-var-btn",
            () => new VarAssignmentStmt(AddVarDocs.styles.backgroundColor),
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
            RandChoiceExpr,
            RangeExpr,
            LenExpr,
            InputExpr,
            StringLiteralExpr,
            FormattedStringLiteralExpr,
            FormattedStringItem,
            NumberLiteralExpr,
            BooleanTrueLiteralExpr,
            BooleanFalseLiteralExpr,
            BinAddExpr,
            BinSubExpr,
            BinMultExpr,
            BinDivExpr,
            BinFloorDivExpr,
            BinModExpr,
            AddOperatorTkn,
            SubOperatorTkn,
            MultOperatorTkn,
            DivOperatorTkn,
            FloorDivOperatorTkn,
            ModOperatorTkn,
            InOperatorTkn,
            NotInOperatorTkn,
            BinAndExpr,
            BinOrExpr,
            AndOperatorTkn,
            OrOperatorTkn,
            BinCompEqExpr,
            BinCompNeqExpr,
            BinCompLtExpr,
            BinCompLteExpr,
            BinCompGtExpr,
            BinCompGteExpr,
            EqOperatorTkn,
            NeqOperatorTkn,
            GtOperatorTkn,
            LtOperatorTkn,
            GteOperatorTkn,
            LteOperatorTkn,
            UnaryNotExpr,
            FindMethodMod,
            WhileStmt,
            BreakStmt,
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
            CastIntExpr,
            VarAssignStmt,
            BinInExpr,
            BinNotInExpr,
            ImportRandintStmt,
            ImportChoiceStmt
        );

        this.actionsMap = new Map<string, EditCodeAction>(this.actionsList.map((action) => [action.cssId, action]));

        this.varActionsMap = new Map<DataType, Array<VarAction>>([
            [
                DataType.Boolean,
                [
                    new VarAction(
                        () => new VarAssignmentStmt(Docs.AddVarDocs.styles.backgroundColor),
                        "set {VAR_ID} to new value",
                        "Set Value"
                    ),
                ],
            ],
            [
                DataType.Number,
                [
                    new VarAction(
                        () => new VarAssignmentStmt(Docs.AddVarDocs.styles.backgroundColor),
                        "set {VAR_ID} to new value",
                        "Set Value"
                    ),
                    new VarAction(
                        () =>
                            new VarOperationStmt(Docs.AddVarDocs.styles.backgroundColor, null, [
                                new AugmentedAssignmentModifier(
                                    AssignAddDocs.styles.backgroundColor,
                                    AugmentedAssignmentOperator.Add
                                ),
                            ]),
                        "add value to {VAR_ID}",
                        "Update Value"
                    ),
                    new VarAction(
                        () =>
                            new VarOperationStmt(Docs.AddVarDocs.styles.backgroundColor, null, [
                                new AugmentedAssignmentModifier(
                                    AssignSubDocs.styles.backgroundColor,
                                    AugmentedAssignmentOperator.Subtract
                                ),
                            ]),
                        "subtract value from {VAR_ID}",
                        "Update Value"
                    ),
                    new VarAction(
                        () =>
                            new VarOperationStmt(Docs.AddVarDocs.styles.backgroundColor, null, [
                                new AugmentedAssignmentModifier(
                                    AssignMultDocs.styles.backgroundColor,
                                    AugmentedAssignmentOperator.Multiply
                                ),
                            ]),
                        "multiply {VAR_ID} by value",
                        "Update Value"
                    ),
                    new VarAction(
                        () =>
                            new VarOperationStmt(Docs.AddVarDocs.styles.backgroundColor, null, [
                                new AugmentedAssignmentModifier(
                                    AssignDivDocs.styles.backgroundColor,
                                    AugmentedAssignmentOperator.Divide
                                ),
                            ]),
                        "divide {VAR_ID} by value",
                        "Update Value"
                    ),
                ],
            ],
            [
                DataType.String,
                [
                    new VarAction(
                        () => new VarAssignmentStmt(Docs.AddVarDocs.styles.backgroundColor),
                        "set {VAR_ID} to new value",
                        "Set Value"
                    ),
                    new VarAction(
                        () =>
                            new VarOperationStmt(Docs.AddVarDocs.styles.backgroundColor, null, [
                                new AugmentedAssignmentModifier(
                                    AssignAddDocs.styles.backgroundColor,
                                    AugmentedAssignmentOperator.Add
                                ),
                            ]),
                        "add text to {VAR_ID}",
                        "Update Value"
                    ),
                    new VarAction(
                        () => new ForStatement(ForDocs.styles.backgroundColor),
                        "loop through characters of {VAR_ID}",
                        "Loops"
                    ),
                    new VarAction(
                        () =>
                            new ValueOperationExpr(SplitDocs.styles.backgroundColor, null, [
                                new MethodCallModifier(
                                    SplitDocs.styles.backgroundColor,
                                    "split",
                                    [new Argument([DataType.String], "sep", false)],
                                    DataType.StringList,
                                    DataType.String
                                ),
                            ]),
                        "split {VAR_ID} using text",
                        "Methods"
                    ),
                    new VarAction(
                        () =>
                            new ValueOperationExpr(JoinDocs.styles.backgroundColor, null, [
                                new MethodCallModifier(
                                    JoinDocs.styles.backgroundColor,
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
                        "join {VAR_ID} using text",
                        "Methods"
                    ),
                    new VarAction(
                        () =>
                            new ValueOperationExpr(ReplaceDocs.styles.backgroundColor, null, [
                                new MethodCallModifier(
                                    ReplaceDocs.styles.backgroundColor,
                                    "replace",
                                    [
                                        new Argument([DataType.String], "old", false),
                                        new Argument([DataType.String], "new", false),
                                    ],
                                    DataType.String,
                                    DataType.String
                                ),
                            ]),
                        "replace first text in {VAR_ID} with second text",
                        "Methods"
                    ),
                    new VarAction(
                        () =>
                            new ValueOperationExpr(FindDocs.styles.backgroundColor, null, [
                                new MethodCallModifier(
                                    FindDocs.styles.backgroundColor,
                                    "find",
                                    [new Argument([DataType.String], "item", false)],
                                    DataType.Number,
                                    DataType.String
                                ),
                            ]),
                        "find position of given text in {VAR_ID}",
                        "Methods"
                    ),
                ],
            ],
            [
                DataType.AnyList,
                [
                    new VarAction(
                        () =>
                            new VarOperationStmt(Docs.AddVarDocs.styles.backgroundColor, null, [
                                new ListAccessModifier(ListIndexDocs.styles.backgroundColor),
                                new AssignmentModifier(AssignDocs.styles.backgroundColor),
                            ]),
                        "set an index in {VAR_ID} to value",
                        "Update List"
                    ),
                    new VarAction(
                        () =>
                            new VarOperationStmt(Docs.AddVarDocs.styles.backgroundColor, null, [
                                new MethodCallModifier(
                                    ListAppendDocs.styles.backgroundColor,
                                    "append",
                                    [new Argument([DataType.Any], "object", false)],
                                    DataType.Void,
                                    DataType.AnyList
                                ),
                            ]),
                        "append value to list {VAR_ID}",
                        "Update List"
                    ),
                    new VarAction(
                        () => new VarAssignmentStmt(Docs.AddVarDocs.styles.backgroundColor),
                        "set {VAR_ID} to new value",
                        "Update List"
                    ),
                    new VarAction(
                        () => new ForStatement(ForDocs.styles.backgroundColor),
                        "loop through items of {VAR_ID}",
                        "Loops"
                    ),
                    new VarAction(
                        () =>
                            new ValueOperationExpr(ListIndexDocs.styles.backgroundColor, null, [
                                new ListAccessModifier(ListIndexDocs.styles.backgroundColor),
                            ]),
                        "get item from {VAR_ID} at index",
                        "Get Value"
                    ),
                ],
            ],
            [
                DataType.Boolean,
                [
                    new VarAction(
                        () =>
                            new VarOperationStmt(Docs.AddVarDocs.styles.backgroundColor, null, [
                                new ListAccessModifier(ListIndexDocs.styles.backgroundColor),
                                new AssignmentModifier(AssignDocs.styles.backgroundColor),
                            ]),
                        "set an index in {VAR_ID} to value",
                        "Update List"
                    ),
                    new VarAction(
                        () =>
                            new VarOperationStmt(Docs.AddVarDocs.styles.backgroundColor, null, [
                                new MethodCallModifier(
                                    ListAppendDocs.styles.backgroundColor,
                                    "append",
                                    [new Argument([DataType.Any], "object", false)],
                                    DataType.Void,
                                    DataType.AnyList
                                ),
                            ]),
                        "append value to list {VAR_ID}",
                        "Update List"
                    ),
                    new VarAction(
                        () => new VarAssignmentStmt(Docs.AddVarDocs.styles.backgroundColor),
                        "set {VAR_ID} to new value",
                        "Update List"
                    ),
                    new VarAction(
                        () => new ForStatement(ForDocs.styles.backgroundColor),
                        "loop through items of {VAR_ID}",
                        "Loops"
                    ),
                    new VarAction(
                        () =>
                            new ValueOperationExpr(ListIndexDocs.styles.backgroundColor, null, [
                                new ListAccessModifier(ListIndexDocs.styles.backgroundColor),
                            ]),
                        "get item from {VAR_ID} at index",
                        "Get Value"
                    ),
                ],
            ],
            [
                DataType.NumberList,
                [
                    new VarAction(
                        () =>
                            new VarOperationStmt(Docs.AddVarDocs.styles.backgroundColor, null, [
                                new ListAccessModifier(ListIndexDocs.styles.backgroundColor),
                                new AssignmentModifier(AssignDocs.styles.backgroundColor),
                            ]),
                        "set an index in {VAR_ID} to value",
                        "Update List"
                    ),
                    new VarAction(
                        () =>
                            new VarOperationStmt(Docs.AddVarDocs.styles.backgroundColor, null, [
                                new MethodCallModifier(
                                    ListAppendDocs.styles.backgroundColor,
                                    "append",
                                    [new Argument([DataType.Any], "object", false)],
                                    DataType.Void,
                                    DataType.AnyList
                                ),
                            ]),
                        "add value to list {VAR_ID}",
                        "Update List"
                    ),
                    new VarAction(
                        () => new VarAssignmentStmt(Docs.AddVarDocs.styles.backgroundColor),
                        "set {VAR_ID} to new value",
                        "Update List"
                    ),
                    new VarAction(
                        () => new ForStatement(ForDocs.styles.backgroundColor),
                        "loop through items of {VAR_ID}",
                        "Loops"
                    ),
                    new VarAction(
                        () =>
                            new ValueOperationExpr(ListIndexDocs.styles.backgroundColor, null, [
                                new ListAccessModifier(ListIndexDocs.styles.backgroundColor),
                            ]),
                        "get item from {VAR_ID} at index",
                        "Get Value"
                    ),
                ],
            ],
            [
                DataType.StringList,
                [
                    new VarAction(
                        () =>
                            new VarOperationStmt(Docs.AddVarDocs.styles.backgroundColor, null, [
                                new ListAccessModifier(ListIndexDocs.styles.backgroundColor),
                                new AssignmentModifier(AssignDocs.styles.backgroundColor),
                            ]),
                        "set an index in {VAR_ID} to value",
                        "Update List"
                    ),
                    new VarAction(
                        () =>
                            new VarOperationStmt(Docs.AddVarDocs.styles.backgroundColor, null, [
                                new MethodCallModifier(
                                    ListAppendDocs.styles.backgroundColor,
                                    "append",
                                    [new Argument([DataType.Any], "object", false)],
                                    DataType.Void,
                                    DataType.AnyList
                                ),
                            ]),
                        "append value to list {VAR_ID}",
                        "Update List"
                    ),
                    new VarAction(
                        () => new VarAssignmentStmt(Docs.AddVarDocs.styles.backgroundColor),
                        "set {VAR_ID} to new value",
                        "Update List"
                    ),
                    new VarAction(
                        () => new ForStatement(ForDocs.styles.backgroundColor),
                        "loop through items of {VAR_ID}",
                        "Loops"
                    ),
                    new VarAction(
                        () =>
                            new ValueOperationExpr(ListIndexDocs.styles.backgroundColor, null, [
                                new ListAccessModifier(ListIndexDocs.styles.backgroundColor),
                            ]),
                        "get item from {VAR_ID} at index",
                        "Get Value"
                    ),
                ],
            ],
        ]);

        this.toolboxCategories.push(
            new ToolboxCategory("Loops", "loops-toolbox-group", [WhileStmt, ForStmt, RangeExpr, BreakStmt])
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
        this.toolboxCategories.push(new ToolboxCategory("Numbers", "numbers-toolbox-group", [NumberLiteralExpr]));
        this.toolboxCategories.push(
            new ToolboxCategory("Random", "randoms-toolbox-group", [RandChoiceExpr, RandIntExpr])
        );
        this.toolboxCategories.push(
            new ToolboxCategory("Texts", "text-toolbox-group", [
                StringLiteralExpr,
                FormattedStringLiteralExpr,
                FormattedStringItem,
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
                BinFloorDivExpr,
                BinModExpr,
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
                BinInExpr,
                BinNotInExpr,
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
        this.toolboxCategories.push(
            new ToolboxCategory("Converts", "convert-ops-toolbox-group", [CastStrExpr, CastIntExpr])
        );
        this.toolboxCategories.push(new ToolboxCategory("Imports", "import-ops-toolbox-group", [ImportStmt]));
    }

    static instance(): Actions {
        if (!Actions.inst) Actions.inst = new Actions();

        return Actions.inst;
    }
}

export enum CodeStatus {
    ContainsEmptyHoles,
    ContainsAutocompleteTokens,
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

export class VarAction {
    description: string;
    group: string;
    action: () => Statement;

    constructor(action: () => Statement, description: string, group: string) {
        this.action = action;
        this.description = description;
        this.group = group;
    }
}
