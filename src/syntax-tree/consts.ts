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

export enum AddableType {
    NotAddable,

    Statement = "Statement",
    Expression = "Expression",
    ExpressionModifier = "Expression Modifier",
    Identifier = "Identifier",
    NumberLiteral = "Number Literal",
    StringLiteral = "String Literal",
}
