import { EditActionType } from "../editor/consts";
import { EditAction } from "../editor/data-types";
import { CSSClasses, TextEnhance } from "../utilities/text-enhance";
import { CodeConstruct } from "./ast";
import { Module } from "./module";

export const TAB_SPACES = 4;

export enum InsertionType {
    Valid, //insertion can be made
    Invalid, //insertion cannot be made
    DraftMode, //insertion will trigger draft mode
}

export enum DataType {
    Number = "Number",
    Boolean = "Boolean",
    String = "String",
    Fractional = "Float",
    Iterator = "Iterator",
    AnyList = "ListAny",
    Set = "Set",
    Dict = "Dict",
    Class = "Class",
    Void = "Void",
    Any = "Any",

    //TODO: If there is ever time then DataType needs to be changed to a class to support nested types like these.
    //There are cases where we want to know what is inside the list such as for for-loop counter vars. They need to know
    //what they are iterating over otherwise no type can be assigned to them
    NumberList = "ListInt",
    BooleanList = "ListBool",
    StringList = "ListStr",
}

export const ListTypes = [DataType.AnyList, DataType.NumberList, DataType.BooleanList, DataType.StringList];
export const IndexableTypes = [...ListTypes, DataType.String];

export enum BinaryOperator {
    Add = "+",
    Subtract = "-",
    Multiply = "*",
    Divide = "/",
    Mod = "%",
    Pow = "**",
    LeftShift = "<<",
    RightShift = ">>",
    BitOr = "|",
    BitXor = "^",
    BitAnd = "&",
    FloorDiv = "//",

    And = "and",
    Or = "or",

    Equal = "==",
    NotEqual = "!=",
    LessThan = "<",
    LessThanEqual = "<=",
    GreaterThan = ">",
    GreaterThanEqual = ">=",
    Is = "is",
    IsNot = "is not",
    In = "in",
    NotIn = "not in",
}

export enum AugmentedAssignmentOperator {
    Add = "+=",
    Subtract = "-=",
    Multiply = "*=",
    Divide = "/=",
    Mod = "%=",
    Pow = "**=",
    LeftShift = "<<=",
    RightShift = ">>=",
    BitOr = "|=",
    BitXor = "^=",
    BitAnd = "&=",
    FloorDiv = "//=",
}

export const arithmeticOps = [
    BinaryOperator.Add,
    BinaryOperator.Subtract,
    BinaryOperator.Multiply,
    BinaryOperator.Divide,
    BinaryOperator.Mod,
    BinaryOperator.Pow,
    BinaryOperator.LeftShift,
    BinaryOperator.RightShift,
    BinaryOperator.BitOr,
    BinaryOperator.BitXor,
    BinaryOperator.BitAnd,
    BinaryOperator.FloorDiv,
];
export const boolOps = [BinaryOperator.And, BinaryOperator.Or];
export const comparisonOps = [
    BinaryOperator.Equal,
    BinaryOperator.NotEqual,
    BinaryOperator.LessThan,
    BinaryOperator.LessThanEqual,
    BinaryOperator.GreaterThan,
    BinaryOperator.GreaterThanEqual,
    BinaryOperator.Is,
    BinaryOperator.IsNot,
    BinaryOperator.In,
    BinaryOperator.NotIn,
];

export enum BinaryOperatorCategory {
    Boolean = "Bool",
    Arithmetic = "Arithmetic",
    Comparison = "Comparison",
    Unspecified = "Unspecified",
}

export enum UnaryOp {
    Invert = "~",
    Not = "not",
    UAdd = "+",
    USub = "-",
}

export enum PythonKeywords {
    and = "and",
    as = "as",
    assert = "assert",
    break = "break",
    class = "class",
    continue = "continue",
    def = "def",
    del = "del",
    elif = "elif",
    else = "else",
    except = "except",
    False = "False",
    finally = "finally",
    for = "for",
    from = "from",
    global = "global",
    if = "if",
    import = "import",
    in = "in",
    is = "is",
    lambda = "lambda",
    None = "none",
    nonlocal = "nonlocal",
    not = "not",
    or = "or",
    pass = "pass",
    raise = "raise",
    return = "return",
    True = "True",
    try = "try",
    while = "while",
    with = "with",
    yield = "yield",
}

export enum BuiltInFunctions {
    abs = "abs",
    delattr = "delattr",
    hash = "hash",
    memoryview = "memoryview",
    set = "set",
    all = "all",
    dict = "dict",
    help = "help",
    min = "min",
    setattr = "setattr",
    any = "any",
    dir = "dir",
    hex = "hex",
    next = "next",
    slice = "slice",
    ascii = "ascii",
    divmod = "divmod",
    id = "id",
    object = "object",
    sorted = "sorted",
    bin = "bin",
    enumerate = "enumerate",
    input = "input",
    oct = "oct",
    staticmethod = "staticmethod",
    bool = "bool",
    eval = "eval",
    int = "int",
    open = "open",
    str = "str",
    breakpoint = "breakpoint",
    exec = "exec",
    isinstance = "isinstance",
    ord = "ord",
    sum = "sum",
    bytearray = "bytearray",
    filter = "filter",
    issubclass = "issubclass",
    pow = "pow",
    super = "super",
    bytes = "bytes",
    float = "float",
    iter = "iter",
    print = "print",
    tuple = "tuple",
    callable = "callable",
    format = "format",
    len = "len",
    property = "property",
    type = "type",
    chr = "chr",
    frozenset = "frozenset",
    list = "list",
    range = "range",
    vars = "vars",
    classmethod = "classmethod",
    getattr = "getattr",
    locals = "locals",
    repr = "repr",
    zip = "zip",
    compile = "compile",
    globals = "globals",
    map = "map",
    reversed = "reversed",
    __import__ = "__import__",
    complex = "complex",
    hasattr = "hasattr",
    max = "max",
    round = "round",
}

export enum AutoCompleteType {
    StartOfLine,
    LeftOfExpression,
    RightOfExpression,
    AtExpressionHole,
}

export const IdentifierRegex = RegExp("^[^\\d\\W]\\w*$");
export const NumberRegex = RegExp("^(([+-][0-9]+)|(([+-][0-9]*)\\.([0-9]+))|([0-9]*)|(([0-9]*)\\.([0-9]*)))$");
export const StringRegex = RegExp('^([^\\r\\n\\"]*)$');

//-------------------
const te = new TextEnhance();

const getTypesString = (types: DataType[]) => {
    let res = "";
    for (const dataType of types) {
        res += te.getStyledSpan(dataType, CSSClasses.type);
        res += ", ";
    }
    res = res.substring(0, res.length - 2);

    return res;
};

export function MISSING_IMPORT_DRAFT_MODE_STR(requiredItem, requiredModule) {
    return (
        te.getStyledSpan(requiredItem, CSSClasses.identifier) +
        " does not exist in this program. It is part of the " +
        te.getStyledSpan(requiredModule, CSSClasses.emphasize) +
        " module. " +
        te.getStyledSpan(requiredModule, CSSClasses.emphasize) +
        " has to be imported before " +
        te.getStyledSpan(requiredItem, CSSClasses.identifier) +
        " can be used."
    );
}

export function TYPE_MISMATCH_EXPR_DRAFT_MODE_STR(construct: string, expectedTypes: DataType[], actualType: DataType) {
    return `${te.getStyledSpan(
        construct,
        CSSClasses.keyword
    )} expected a value one of the following types: ${getTypesString(
        expectedTypes
    )} in this hole, but you tried to input a value of type ${te.getStyledSpan(
        actualType,
        CSSClasses.type
    )} instead. A conversion from ${te.getStyledSpan(
        actualType,
        CSSClasses.type
    )} to one of the expected types is possible using:`;
}

export function TYPE_MISMATCH_IN_HOLE_DRAFT_MODE_STR(expectedTypes: DataType[], actualType: DataType) {
    return `Expected a value one of the following types: ${getTypesString(
        expectedTypes
    )}, but you tried to input a value of type ${te.getStyledSpan(
        actualType,
        CSSClasses.type
    )} instead. A conversion from ${te.getStyledSpan(
        actualType,
        CSSClasses.type
    )} to one of the expected types is possible using one of:`;
}

export function TYPE_MISMATCH_ON_MODIFIER_DELETION_DRAFT_MODE_STR(
    identifier: string,
    varType: DataType,
    expectedTypes: DataType[]
) {
    return `${te.getStyledSpan(identifier, CSSClasses.identifier)} is a ${te.getStyledSpan(
        varType,
        CSSClasses.type
    )}, but a value of ${getTypesString(expectedTypes)} was expected. You can convert from ${te.getStyledSpan(
        varType,
        CSSClasses.type
    )} to one of the expected types is possible using one of:`;
}

export function TYPE_MISMATCH_ON_FUNC_ARG_DRAFT_MODE_STR(
    functionName: string,
    expectedTypes: DataType[],
    actualType: DataType
) {
    return `Expected a value one of the following types: ${getTypesString(expectedTypes)}, but ${te.getStyledSpan(
        functionName,
        CSSClasses.identifier
    )} returns a value of type ${te.getStyledSpan(
        actualType,
        CSSClasses.type
    )} instead. A conversion from ${te.getStyledSpan(
        actualType,
        CSSClasses.type
    )} to one of the expected types is possible using one of:`;
}

export abstract class TypeConversionRecord {
    conversionConstruct: string;
    conversionConstructId: string;
    convertTo: DataType;
    convertFrom: DataType;
    editActionType: EditActionType;
    executer: any;
    focus: any;
    validator: any;

    constructor(
        conversionConstruct: string,
        convertTo: DataType,
        convertFrom: DataType,
        conversionConstructId: string,
        editActionType: EditActionType
    ) {
        this.conversionConstruct = conversionConstruct;
        this.convertFrom = convertFrom;
        this.convertTo = convertTo;
        this.conversionConstructId = conversionConstructId;
        this.editActionType = editActionType;
    }

    protected abstract getConversionCode(itemToConvert: string): string;

    getConversionButton(itemToConvert: string, module: Module, codeToReplace: CodeConstruct): HTMLDivElement {
        const text = this.getConversionCode(itemToConvert);
        const button = document.createElement("div");
        button.textContent = text;

        const actionType = this.editActionType;
        const conversionConstructId = this.conversionConstructId;

        button.addEventListener("click", () => {
            module.replaceFocusedExpression;
            module.executer.execute(
                new EditAction(actionType, {
                    codeToReplace: codeToReplace,
                    conversionConstructId: conversionConstructId,
                    typeToConvertTo: this.convertTo,
                }),
                module.focus.getContext()
            );
        });

        return button;
    }
}

export class CastConversionRecord extends TypeConversionRecord {
    constructor(
        conversionConstruct: string,
        convertTo: DataType,
        convertFrom: DataType,
        conversionAction: string,
        editActionType: EditActionType
    ) {
        super(conversionConstruct, convertTo, convertFrom, conversionAction, editActionType);
    }

    getConversionCode(itemToConvert): string {
        return `${this.conversionConstruct.substring(0, this.conversionConstruct.length - 1)}${itemToConvert})`;
    }
}

export class ComparisonConversionRecord extends TypeConversionRecord {
    constructor(
        conversionConstruct: string,
        convertTo: DataType,
        convertFrom: DataType,
        conversionAction: string,
        editActionType: EditActionType
    ) {
        super(conversionConstruct, convertTo, convertFrom, conversionAction, editActionType);
    }

    getConversionCode(itemToConvert): string {
        return `${itemToConvert} ${this.conversionConstruct} ---`;
    }
}

export class MemberFunctionConversionRecord extends TypeConversionRecord {
    constructor(
        conversionConstruct: string,
        convertTo: DataType,
        convertFrom: DataType,
        conversionAction: string,
        editActionType: EditActionType
    ) {
        super(conversionConstruct, convertTo, convertFrom, conversionAction, editActionType);
    }

    getConversionCode(itemToConvert): string {
        return `${itemToConvert}.${this.conversionConstruct}`;
    }
}

export class FunctionExprConversionRecord extends CastConversionRecord {
    constructor(
        conversionConstruct: string,
        convertTo: DataType,
        convertFrom: DataType,
        conversionAction: string,
        editActionType: EditActionType
    ) {
        super(conversionConstruct, convertTo, convertFrom, conversionAction, editActionType);
    }

    getConversionCode(itemToConvert): string {
        return super.getConversionCode(itemToConvert);
    }
}

export class MemberAccessConversion extends TypeConversionRecord {
    constructor(
        conversionConstruct: string,
        convertTo: DataType,
        convertFrom: DataType,
        conversionAction: string,
        editActionType: EditActionType
    ) {
        super(conversionConstruct, convertTo, convertFrom, conversionAction, editActionType);
    }

    getConversionCode(itemToConvert): string {
        return `${itemToConvert}${this.conversionConstruct}`;
    }
}

export const typeToConversionRecord = new Map<String, TypeConversionRecord[]>([
    [
        DataType.Number,
        [
            new CastConversionRecord(
                "str()",
                DataType.String,
                DataType.Number,
                "add-cast-str-btn",
                EditActionType.InsertTypeCast
            ),

            new ComparisonConversionRecord(
                "==",
                DataType.Boolean,
                DataType.Number,
                "add-comp-eq-expr-btn",
                EditActionType.InsertComparisonConversion
            ),
            new ComparisonConversionRecord(
                "!=",
                DataType.Boolean,
                DataType.Number,
                "add-comp-neq-expr-btn",
                EditActionType.InsertComparisonConversion
            ),
            new ComparisonConversionRecord(
                ">=",
                DataType.Boolean,
                DataType.Number,
                "add-comp-gte-expr-btn",
                EditActionType.InsertComparisonConversion
            ),
            new ComparisonConversionRecord(
                "<=",
                DataType.Boolean,
                DataType.Number,
                "--- <= ---",
                EditActionType.InsertComparisonConversion
            ),
            new ComparisonConversionRecord(
                "<",
                DataType.Boolean,
                DataType.Number,
                "add-comp-lt-expr-btn",
                EditActionType.InsertComparisonConversion
            ),
            new ComparisonConversionRecord(
                ">",
                DataType.Boolean,
                DataType.Number,
                "add-comp-gt-expr-btn",
                EditActionType.InsertComparisonConversion
            ),
        ],
    ],
    [
        DataType.String,
        [
            new ComparisonConversionRecord(
                "==",
                DataType.Boolean,
                DataType.String,
                "add-comp-eq-expr-btn",
                EditActionType.InsertComparisonConversion
            ),
            new ComparisonConversionRecord(
                "!=",
                DataType.Boolean,
                DataType.String,
                "add-comp-neq-expr-btn",
                EditActionType.InsertComparisonConversion
            ),
            new ComparisonConversionRecord(
                ">=",
                DataType.Boolean,
                DataType.String,
                "add-comp-gte-expr-btn",
                EditActionType.InsertComparisonConversion
            ),
            new ComparisonConversionRecord(
                "<=",
                DataType.Boolean,
                DataType.String,
                "--- <= ---",
                EditActionType.InsertComparisonConversion
            ),
            new ComparisonConversionRecord(
                "<",
                DataType.Boolean,
                DataType.String,
                "add-comp-lt-expr-btn",
                EditActionType.InsertComparisonConversion
            ),
            new ComparisonConversionRecord(
                ">",
                DataType.Boolean,
                DataType.String,
                "add-comp-gt-expr-btn",
                EditActionType.InsertComparisonConversion
            ),

            new MemberFunctionConversionRecord(
                "find()",
                DataType.Number,
                DataType.String,
                "add-find-method-call-btn",
                EditActionType.InsertMemberCallConversion
            ),
            new MemberFunctionConversionRecord(
                "split()",
                DataType.StringList,
                DataType.String,
                "add-split-method-call-btn",
                EditActionType.InsertMemberCallConversion
            ),

            new FunctionExprConversionRecord(
                "len()",
                DataType.Number,
                DataType.String,
                "add-len-btn",
                EditActionType.InsertFunctionConversion
            ),
        ],
    ],
    [
        DataType.BooleanList,
        [
            new MemberAccessConversion(
                "[---]",
                DataType.Boolean,
                DataType.BooleanList,
                "add-list-index-btn",
                EditActionType.InsertMemberAccessConversion
            ),
            new FunctionExprConversionRecord(
                "len()",
                DataType.Number,
                DataType.BooleanList,
                "add-len-btn",
                EditActionType.InsertFunctionConversion
            ),
        ],
    ],
    [
        DataType.StringList,
        [
            new MemberAccessConversion(
                "[---]",
                DataType.String,
                DataType.StringList,
                "add-list-index-btn",
                EditActionType.InsertMemberAccessConversion
            ),
            new FunctionExprConversionRecord(
                "len()",
                DataType.Number,
                DataType.StringList,
                "add-len-btn",
                EditActionType.InsertFunctionConversion
            ),
        ],
    ],
    [
        DataType.NumberList,
        [
            new MemberAccessConversion(
                "[---]",
                DataType.Number,
                DataType.NumberList,
                "add-list-index-btn",
                EditActionType.InsertMemberAccessConversion
            ),
            new FunctionExprConversionRecord(
                "len()",
                DataType.Number,
                DataType.NumberList,
                "add-len-btn",
                EditActionType.InsertFunctionConversion
            ),
        ],
    ],
    [
        DataType.AnyList,
        [
            new MemberAccessConversion(
                "[---]",
                DataType.Any,
                DataType.AnyList,
                "add-list-index-btn",
                EditActionType.InsertMemberAccessConversion
            ),
            new FunctionExprConversionRecord(
                "len()",
                DataType.Number,
                DataType.AnyList,
                "add-len-btn",
                EditActionType.InsertFunctionConversion
            ),
        ],
    ],
]);
