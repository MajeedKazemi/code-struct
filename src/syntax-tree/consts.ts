import { CSSClasses, TextEnhance } from "../utilities/text-enhance";

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

export function TYPE_MISMATCH_EXPR_STR(
    construct: string,
    expectedTypes: DataType[],
    actualType: DataType,
    conversionInstructions: string
) {
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
    )} to one of the expected types is possible using ${conversionInstructions}.`;
}

export function TYPE_MISMATCH_HOLE_STR(
    expectedTypes: DataType[],
    actualType: DataType,
    conversionInstructions: string
) {
    return `Expected a value one of the following types: ${getTypesString(
        expectedTypes
    )}, but you tried to input a value of type ${te.getStyledSpan(
        actualType,
        CSSClasses.type
    )} instead. A conversion from ${te.getStyledSpan(
        actualType,
        CSSClasses.type
    )} to one of the expected types is possible using one of: ${conversionInstructions}`;
}

export function TYPE_MISMATCH_ON_MODIFIER_DELETION_STR(
    identifier: string,
    varType: DataType,
    expectedTypes: DataType[],
    conversionInstruction: string
) {
    return `${te.getStyledSpan(identifier, CSSClasses.identifier)} is a ${te.getStyledSpan(
        varType,
        CSSClasses.type
    )}, but a value of ${getTypesString(expectedTypes)} was expected. You can convert from ${te.getStyledSpan(
        varType,
        CSSClasses.type
    )} to one of the expected types is possible using one of: ${conversionInstruction}`;
}

export function TYPE_MISMATCH_HOLE_FUNC_STR(
    functionName: string,
    expectedTypes: DataType[],
    actualType: DataType,
    conversionInstructions: string
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
    )} to one of the expected types is possible using one of: ${conversionInstructions}.`;
}

export abstract class TypeConversionRecord{
    conversionConstruct: string;
    convertTo: DataType;
    convertFrom: DataType;
    conversionAction: string;
    
    constructor(conversionConstruct: string, convertTo: DataType, convertFrom: DataType, conversionAction: string){
        this.conversionConstruct = conversionConstruct;
        this.convertFrom = convertFrom;
        this.convertTo = convertTo;
        this.conversionAction = conversionAction;
    }

    abstract getConversionCode(itemToConvert: string): string;     

    getConversionInstruction(itemToConvert: string): string{
        return `${itemToConvert} can be ${this.conversionAction} to `;
    }

    static getConversionString(from: DataType, to: DataType[], itemToConvert: string): string{
        const records = []
        records.push(...typeToConversionRecord.get(from));
        for(let i = 0; i < records.length; i++){
            if(to.indexOf(records[i].convertTo) === -1){
                records.splice(i, 1);
            }
        }

        let str = "";
        for(const record of records){
            str += `${record.getConversionCode(itemToConvert)}, `;
        }

        str = str.substring(0, str.length - 2) + "."
        return str;
    }
}

export class CastConversionRecord extends TypeConversionRecord{
    constructor(conversionConstruct: string, convertTo: DataType, convertFrom: DataType, conversionAction: string){
        super(conversionConstruct, convertTo, convertFrom, conversionAction);
    }

    getConversionCode(itemToConvert){
        return `${this.conversionConstruct.substring(0, this.conversionConstruct.length - 1)}${itemToConvert})`;
    }
}

export class ComparisonConversionRecord extends TypeConversionRecord{
    constructor(conversionConstruct: string, convertTo: DataType, convertFrom: DataType, conversionAction: string){
        super(conversionConstruct, convertTo, convertFrom, conversionAction);
    }

    getConversionCode(itemToConvert){
        return `${itemToConvert} ${this.conversionConstruct} ---`;
    }
}

export class MemberFunctionConversionRecord extends TypeConversionRecord{
    constructor(conversionConstruct: string, convertTo: DataType, convertFrom: DataType, conversionAction: string){
        super(conversionConstruct, convertTo, convertFrom, conversionAction);
    }

    getConversionCode(itemToConvert){
        return `${itemToConvert}.${this.conversionConstruct}`;
    }
}

export class FunctionExprConversionRecord extends CastConversionRecord{
    constructor(conversionConstruct: string, convertTo: DataType, convertFrom: DataType, conversionAction: string){
        super(conversionConstruct, convertTo, convertFrom, conversionAction);
    }

    getConversionCode(itemToConvert){
        return super.getConversionCode(itemToConvert);
    }
}

export class MemberAccessConversion extends TypeConversionRecord{
    constructor(conversionConstruct: string, convertTo: DataType, convertFrom: DataType, conversionAction: string){
        super(conversionConstruct, convertTo, convertFrom, conversionAction);
    }

    getConversionCode(itemToConvert){
        return `${itemToConvert}${this.conversionConstruct}`;
    }
}

export const typeToConversionRecord = new Map<String, TypeConversionRecord[]>(
    [
        [
            DataType.Number, [new CastConversionRecord("str()", DataType.String, DataType.Number, "cast"),
            
                              new ComparisonConversionRecord("==", DataType.Boolean, DataType.Number, "converted"),
                              new ComparisonConversionRecord("!=", DataType.Boolean, DataType.Number, "converted"),
                              new ComparisonConversionRecord(">=", DataType.Boolean, DataType.Number, "converted"),
                              new ComparisonConversionRecord("<=", DataType.Boolean, DataType.Number, "converted"),
                              new ComparisonConversionRecord("<", DataType.Boolean, DataType.Number, "converted"),
                              new ComparisonConversionRecord(">", DataType.Boolean, DataType.Number, "converted")
                            ]
        ],
        [
            DataType.String, [new ComparisonConversionRecord("==", DataType.Boolean, DataType.String, "converted"),
                              new ComparisonConversionRecord("!=", DataType.Boolean, DataType.String, "converted"),
                              new ComparisonConversionRecord(">=", DataType.Boolean, DataType.String, "converted"),
                              new ComparisonConversionRecord("<=", DataType.Boolean, DataType.String, "converted"),
                              new ComparisonConversionRecord("<", DataType.Boolean, DataType.String, "converted"),
                              new ComparisonConversionRecord(">", DataType.Boolean, DataType.String, "converted"),
                            
                              new MemberFunctionConversionRecord("find()", DataType.Number, DataType.String, "converted"),
                              new MemberFunctionConversionRecord("split()", DataType.StringList, DataType.String, "converted"),

                              new FunctionExprConversionRecord("len()", DataType.Number, DataType.String, "converted")
                            ]
        ],
        [
            DataType.BooleanList, [new MemberAccessConversion("[---]", DataType.Boolean, DataType.BooleanList, "converted"),
                                   new FunctionExprConversionRecord("len()", DataType.Number, DataType.BooleanList, "converted")
                                  ]
        ],
        [
            DataType.StringList, [new MemberAccessConversion("[---]", DataType.String, DataType.StringList, "converted"),
                                  new FunctionExprConversionRecord("len()", DataType.Number, DataType.StringList, "converted")
                                 ]
        ],
        [
            DataType.NumberList, [new MemberAccessConversion("[---]", DataType.Number, DataType.NumberList, "converted"),
                                  new FunctionExprConversionRecord("len()", DataType.Number, DataType.NumberList, "converted")
                                 ]
        ],
        [
            DataType.AnyList, [new MemberAccessConversion("[---]", DataType.Any, DataType.AnyList, "converted"),
                               new FunctionExprConversionRecord("len()", DataType.Number, DataType.AnyList, "converted")
                              ]
        ]
    ]
);