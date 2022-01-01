import { EditActionType } from "../editor/consts";
import { EditAction } from "../editor/data-types";
import { CSSClasses, TextEnhance } from "../utilities/text-enhance";
import { getUserFriendlyType } from "../utilities/util";
import { CodeConstruct, Expression, FunctionCallExpr, Modifier } from "./ast";
import { Callback, CallbackType } from "./callback";
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
    FormattedString = "FormattedString",
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

export enum UnaryOperator {
    Invert = "~",
    Not = "not",
    UAdd = "+",
    USub = "-",
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

export const arithmeticOps: Array<BinaryOperator | UnaryOperator> = [
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

export const boolOps: Array<BinaryOperator | UnaryOperator> = [
    BinaryOperator.And,
    BinaryOperator.Or,
    UnaryOperator.Not,
];

export const comparisonOps: Array<BinaryOperator | UnaryOperator> = [
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

export enum OperatorCategory {
    Boolean = "Bool",
    Arithmetic = "Arithmetic",
    Comparison = "Comparison",
    Unspecified = "Unspecified",
    UnaryBoolean = "UnaryBoolean",
}

export function getOperatorCategory(operator: BinaryOperator | UnaryOperator): OperatorCategory {
    if (arithmeticOps.indexOf(operator) > -1) {
        return OperatorCategory.Arithmetic;
    } else if (boolOps.indexOf(operator) > -1) {
        return OperatorCategory.Boolean;
    } else if (comparisonOps.indexOf(operator) > -1) {
        return OperatorCategory.Comparison;
    } else return OperatorCategory.Unspecified;
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
    AtEmptyOperatorHole,
}

export const IdentifierRegex = RegExp("^[^\\d\\W]\\w*$");
export const NumberRegex = RegExp("^(([+-][0-9]+)|(([+-][0-9]*)\\.([0-9]+))|([0-9]*)|(([0-9]*)\\.([0-9]*)))$");
export const StringRegex = RegExp('^([^\\r\\n\\"]*)$');

export enum Tooltip {
    None = "",
    InvalidInsertElse = "Can only be inserted directly below an if or elif statement.",
    InvalidInsertElif = "Can only be inserted directly below an if statement.",
    InvalidInsertListElementAccess = "Can only be inserted after a variable that is a list.",
    InvalidInsertListComma = "Can only be inserted after or before the elements inside a list",
    InvalidInsertBreak = "Can only be inserted on an empty line within a loop.",
    InvalidInsertCurlyBraceWithinFString = "Can only be inserted within an f'' string expression.",
    InvalidInsertStatement = "Can only be inserted on an empty line.",
    InvalidInsertModifier = "Can only be inserted after a variable reference or a literal value of the appropriate type.",
    InvalidInsertExpression = "Can only be inserted inside a hole (<hole1 class='errorTooltipHole'></hole1>) of matching type.",
    InvalidAugmentedAssignment = "Can only be inserted after a variable reference on an empty line.",
    TypeMismatch = "Inserting this will cause a type mismatch and will require you to convert the inserted expression to the correct type",
    IgnoreWarning = "Ignore this warning",
    Delete = "Delete",
}

//-------------------
const te = new TextEnhance();

const getTypesString = (types: DataType[]) => {
    let res = "";
    for (const dataType of types) {
        res += te.getStyledSpan(getUserFriendlyType(dataType), CSSClasses.type);
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
    return `${te.getStyledSpan(construct, CSSClasses.keyword)} expected a ${getTypesString(
        expectedTypes
    )}, but you entered a ${te.getStyledSpan(
        getUserFriendlyType(actualType),
        CSSClasses.type
    )} instead.\nYou can fix this by:`;
}

export function TYPE_MISMATCH_IN_HOLE_DRAFT_MODE_STR(expectedTypes: DataType[], actualType: DataType) {
    return `Expected a ${getTypesString(expectedTypes)}, but you entered a ${te.getStyledSpan(
        getUserFriendlyType(actualType),
        CSSClasses.type
    )} instead.\n You can fix this by:`;
}

export function TYPE_MISMATCH_ANY(expectedTypes: DataType[], actualType: DataType) {
    return `Expected a ${getTypesString(expectedTypes)}, but you entered an ${te.getStyledSpan(
        getUserFriendlyType(actualType),
        CSSClasses.type
    )} instead.\n Type ${te.getStyledSpan(
        getUserFriendlyType(actualType),
        CSSClasses.type
    )} can represent any type, but you need to make sure it is one of the expected types.`;
}

export function TYPE_MISMATCH_ON_MODIFIER_DELETION_DRAFT_MODE_STR(
    identifier: string,
    varType: DataType,
    expectedTypes: DataType[]
) {
    return `${te.getStyledSpan(identifier, CSSClasses.identifier)} is a ${te.getStyledSpan(
        getUserFriendlyType(varType),
        CSSClasses.type
    )}, but expected a ${getTypesString(expectedTypes)}. You can fix this by:`;
}

export function GET_BINARY_OPERATION_NOT_DEFINED_FOR_TYPE_DELETE_MSG(type: DataType) {
    return `Two items of type ${te.getStyledSpan(
        getUserFriendlyType(type),
        CSSClasses.type
    )} cannot be added togeter. Consider removing this code.`;
}

export function GET_BINARY_OPERATION_NOT_DEFINED_FOR_TYPE_CONVERT_MSG(type: DataType) {
    return `Two items of type ${te.getStyledSpan(
        getUserFriendlyType(type),
        CSSClasses.type
    )} cannot be added togeter. You can convert this to a type that can be added with one of : `;
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
        getUserFriendlyType(actualType),
        CSSClasses.type
    )} instead. A conversion from ${te.getStyledSpan(
        getUserFriendlyType(actualType),
        CSSClasses.type
    )} to one of the expected types is possible using one of:`;
}

export function addClassToDraftModeResolutionButton(button: HTMLDivElement, codeToReplace: CodeConstruct) {
    if (!(codeToReplace instanceof Expression) && !(codeToReplace instanceof Modifier)) {
        button.classList.add("statement-button");
    } else if (codeToReplace instanceof Modifier) {
        button.classList.add("modifier-button");
    } else if (codeToReplace instanceof Expression) {
        button.classList.add("expression-button");
    }
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
        let conversionText = itemToConvert;
        if (codeToReplace instanceof FunctionCallExpr) {
            conversionText = codeToReplace.getFullConstructText();
        }

        const text = this.getConversionCode(conversionText);
        const button = document.createElement("div");
        button.innerHTML = text.replace(/---/g, "<hole1></hole1>");

        const actionType = this.editActionType;
        const conversionConstructId = this.conversionConstructId;

        addClassToDraftModeResolutionButton(button, codeToReplace);

        button.addEventListener("click", () => {
            module.executer.execute(
                new EditAction(actionType, {
                    codeToReplace: codeToReplace,
                    conversionConstructId: conversionConstructId,
                    typeToConvertTo: this.convertTo,
                }),
                module.focus.getContext()
            );
        });

        codeToReplace.subscribe(
            CallbackType.change,
            new Callback(() => {
                let newConversionText = itemToConvert;
                if (codeToReplace instanceof FunctionCallExpr) {
                    newConversionText = codeToReplace.getFullConstructText();
                }

                button.innerHTML = this.getConversionCode(
                    codeToReplace instanceof FunctionCallExpr ? newConversionText : codeToReplace.getKeyword()
                ).replace(/---/g, "<hole1></hole1>");
            })
        );

        return button;
    }
}

export class IgnoreConversionRecord extends TypeConversionRecord {
    warningText: string = "";

    constructor(
        conversionConstruct: string,
        convertTo: DataType,
        convertFrom: DataType,
        conversionAction: string,
        editActionType: EditActionType,
        warningText: string
    ) {
        super(conversionConstruct, convertTo, convertFrom, conversionAction, editActionType);

        this.warningText = warningText;
    }

    protected getConversionCode(itemToConvert: string): string {
        return "";
    }

    getConversionButton(itemToConvert: string, module: Module, codeToReplace: CodeConstruct): HTMLDivElement {
        const text = this.warningText;
        const button = document.createElement("div");
        button.innerHTML = text.replace(/---/g, "<hole1></hole1>");

        addClassToDraftModeResolutionButton(button, codeToReplace);

        button.addEventListener("click", () => {
            module.closeConstructDraftRecord(codeToReplace);
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
        if (ListTypes.indexOf(this.convertTo) > -1) {
            return `${this.conversionConstruct.substring(0, this.conversionConstruct.length - 1)}${itemToConvert}]`;
        }
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
        return `${itemToConvert} ${this.conversionConstruct}&nbsp;---`;
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

//this map is for converting from one type to another, to see what each type can be converted to see typeConversionMap in util.ts
//really the two can be combined, but that can be done in the future
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
                "---&nbsp;<=&nbsp;---",
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
            new CastConversionRecord(
                "[]",
                DataType.NumberList,
                DataType.Number,
                "add-list-literal-btn",
                EditActionType.InsertTypeCast
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
                "---&nbsp;<=&nbsp;---",
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

            new CastConversionRecord(
                "int()",
                DataType.Number,
                DataType.String,
                "add-cast-int-btn",
                EditActionType.InsertTypeCast
            ),

            new CastConversionRecord(
                "[]",
                DataType.StringList,
                DataType.String,
                "add-list-literal-btn",
                EditActionType.InsertTypeCast
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
    [
        DataType.Boolean,
        [
            new CastConversionRecord(
                "[]",
                DataType.BooleanList,
                DataType.Boolean,
                "add-list-literal-btn",
                EditActionType.InsertTypeCast
            ),
        ],
    ],
]);

export const definedBinOpsForType = new Map<DataType, BinaryOperator[]>([
    [
        DataType.String,
        [
            BinaryOperator.Add,
            BinaryOperator.GreaterThan,
            BinaryOperator.LessThan,
            BinaryOperator.GreaterThanEqual,
            BinaryOperator.LessThanEqual,
            BinaryOperator.Equal,
            BinaryOperator.NotEqual,
        ],
    ],

    [
        DataType.Number,
        [
            BinaryOperator.Add,
            BinaryOperator.Multiply,
            BinaryOperator.Subtract,
            BinaryOperator.Divide,
            BinaryOperator.GreaterThan,
            BinaryOperator.LessThan,
            BinaryOperator.GreaterThanEqual,
            BinaryOperator.LessThanEqual,
            BinaryOperator.Equal,
            BinaryOperator.NotEqual,
            BinaryOperator.Mod,
        ],
    ],

    [DataType.Boolean, [BinaryOperator.And, BinaryOperator.Or]],
    [DataType.AnyList, [BinaryOperator.Add]],
    [DataType.StringList, [BinaryOperator.Add]],
    [DataType.NumberList, [BinaryOperator.Add]],
    [DataType.BooleanList, [BinaryOperator.Add]],
]);

export const definedUnaryOpsForType = new Map<DataType, UnaryOperator[]>([[DataType.Boolean, [UnaryOperator.Not]]]);

export const definedBinOpsBetweenType = new Map<BinaryOperator, [DataType, DataType][]>([
    [
        BinaryOperator.Add,
        [
            [DataType.AnyList, DataType.BooleanList],
            [DataType.AnyList, DataType.StringList],
            [DataType.AnyList, DataType.NumberList],
            [DataType.NumberList, DataType.StringList],
            [DataType.NumberList, DataType.BooleanList],
            [DataType.StringList, DataType.BooleanList],
        ],
    ],
]);
