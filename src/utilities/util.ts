import { Module } from "../syntax-tree/module";
import { ConstructDoc } from "../suggestions/construct-doc";
import { BinaryOperator, DataType, UnaryOp } from "./../syntax-tree/consts";
import {
    Argument,
    BinaryOperatorExpr,
    CodeConstruct,
    ElseStatement,
    ForStatement,
    FunctionCallStmt,
    IfStatement,
    ListElementAssignment,
    ListLiteralExpression,
    LiteralValExpr,
    MemberCallStmt,
    MethodCallExpr,
    MethodCallStmt,
    UnaryOperatorExpr,
    VarAssignmentStmt,
    WhileStatement,
} from "../syntax-tree/ast";

/**
 * IMPORTANT!!!
 *
 * constructKeys and ConstructKeys need to have the same values.
 *
 * The enum is so that we can get a dummy construct anywhere in the code.
 * The list is so that we can loop over all dumy constructs since Map does not have a public keys property.
 *
 * In regular JS we could always call Object.keys(ConstructKeys), but not in TS.
 */
export const constructKeys = [
    "VarAssign",
    "print()",
    "randint()",
    "range()",
    "len()",
    "string",
    "int",
    "True",
    "False",
    "+",
    "-",
    "*",
    "/",
    "And",
    "Or",
    "Not",
    "==",
    "!=",
    "<",
    "<=",
    ">",
    ">=",
    "while",
    "If",
    "Elif",
    "Else",
    "For",
    "List Literal",
    ".append()",
    "List Element Access",
    ".split()",
    ".join()",
    ".replace()",
    ".find()",
    "List Element Assignment",
];

/**
 * To add a construct to the general menu (the one that is displayed with Ctrl+Space).
 *  1. Add a Construct Key for it in ConstructKeys enum.
 *  2. Add a dummy construct for it in Util.dummyToolboxConstructs.
 *  3. Add an action for it in Util.constructActions.
 *  4. Modify the menuMap in suggestions-controller.ts->buildAvailableInsertsMenu to include your construct.
 */

export enum ConstructKeys {
    VariableAssignment = "VarAssign",
    PrintCall = "print()",
    RandintCall = "randint()",
    RangeCall = "range()",
    LenCall = "len()",
    StringLiteral = "string",
    NumberLiteral = "int",
    True = "True",
    False = "False",
    Addition = "+",
    Subtraction = "-",
    Multiplication = "*",
    Division = "/",
    And = "And",
    Or = "Or",
    Not = "Not",
    Equals = "==",
    NotEquals = "!=",
    LessThan = "<",
    LessThanOrEqual = "<=",
    GreaterThan = ">",
    GreaterThanOrEqual = ">=",
    While = "while",
    If = "if",
    Elif = "elif",
    Else = "else",
    For = "for",
    ListLiteral = "List Literal",
    AppendCall = ".append()",
    SplitCall = ".split()",
    JoinCall = ".join()",
    ReplaceCall = ".replace()",
    FindCall = ".find()",
    MemberCall = "List Element Access",
    ListElementAssignment = "List Element Assignment",
}

export const constructToToolboxButton = new Map<ConstructKeys, string>([
    [ConstructKeys.VariableAssignment, "add-var-btn"],

    [ConstructKeys.PrintCall, "add-print-btn"],

    [ConstructKeys.RandintCall, "add-randint-btn"],

    [ConstructKeys.RangeCall, "add-range-btn"],

    [ConstructKeys.LenCall, "add-len-btn"],

    [ConstructKeys.StringLiteral, "add-str-btn"],

    [ConstructKeys.NumberLiteral, "add-num-btn"],

    [ConstructKeys.True, "add-true-btn"],

    [ConstructKeys.False, "add-false-btn"],

    [ConstructKeys.Addition, "add-bin-add-expr-btn"],

    [ConstructKeys.Subtraction, "add-bin-sub-expr-btn"],

    [ConstructKeys.Multiplication, "add-bin-mul-expr-btn"],

    [ConstructKeys.Division, "add-bin-div-expr-btn"],

    [ConstructKeys.And, "add-bin-and-expr-btn"],

    [ConstructKeys.Or, "add-bin-or-expr-btn"],

    [ConstructKeys.Not, "add-unary-not-expr-btn"],

    [ConstructKeys.Equals, "add-comp-eq-expr-btn"],

    [ConstructKeys.NotEquals, "add-comp-neq-expr-btn"],

    [ConstructKeys.LessThan, "add-comp-lt-expr-btn"],

    [ConstructKeys.LessThanOrEqual, "add-comp-lte-expr-btn"],

    [ConstructKeys.GreaterThan, "add-comp-gt-expr-btn"],

    [ConstructKeys.GreaterThanOrEqual, "add-comp-gte-expr-btn"],

    [ConstructKeys.While, "add-while-expr-btn"],

    [ConstructKeys.If, "add-if-expr-btn"],

    [ConstructKeys.Elif, "add-elif-expr-btn"],

    [ConstructKeys.Else, "add-else-expr-btn"],

    [ConstructKeys.For, "add-for-expr-btn"],

    [ConstructKeys.ListLiteral, "add-list-literal-btn"],

    [ConstructKeys.SplitCall, "add-split-method-call-btn"],

    [ConstructKeys.JoinCall, "add-join-method-call-btn"],

    [ConstructKeys.ReplaceCall, "add-replace-method-call-btn"],

    [ConstructKeys.FindCall, "add-find-method-call-btn"],

    [ConstructKeys.ListElementAssignment, "add-list-elem-assign-btn"],

    [ConstructKeys.AppendCall, "add-list-append-stmt-btn"],

    [ConstructKeys.MemberCall, "add-list-index-btn"],
]);

export class Util {
    private static instance: Util;

    dummyToolboxConstructs: Map<string, CodeConstruct>;
    constructActions: Map<string, Function>;
    constructDocs: Map<string, ConstructDoc>;
    typeConversionMap: Map<DataType, Array<DataType>>;
    module: Module;

    private constructor(module: Module) {
        this.module = module;

        //these cannot exist on their own, need to wrap them in a class. Otherwise they does not see the imports for the construct classes.

        //stores information about what types an object or literal of a given type can be converted to either through casting or
        //some other manipulation such as [number] or number === --- or accessing some property such as list.length > 0
        this.typeConversionMap = new Map<DataType, Array<DataType>>([
            [DataType.Number, [DataType.String, DataType.NumberList, DataType.Boolean]],
            [DataType.String, [DataType.StringList, DataType.Boolean]],
            [DataType.Boolean, [DataType.BooleanList]],
            [DataType.AnyList, [DataType.Boolean]],
            [DataType.NumberList, [DataType.Boolean]],
            [DataType.BooleanList, [DataType.Boolean]],
            [DataType.StringList, [DataType.Boolean]],
            [DataType.Any, [DataType.Boolean, DataType.Number, DataType.String, DataType.AnyList]],
        ]);

        this.dummyToolboxConstructs = new Map<string, CodeConstruct>([
            [ConstructKeys.VariableAssignment, new VarAssignmentStmt()],
            [
                ConstructKeys.PrintCall,
                new FunctionCallStmt("print", [new Argument([DataType.Any], "item", false)], DataType.Void),
            ],
            [
                ConstructKeys.RandintCall,
                new FunctionCallStmt(
                    "randint",
                    [new Argument([DataType.Number], "start", false), new Argument([DataType.Number], "end", false)],
                    DataType.Number
                ),
            ],
            [
                ConstructKeys.RangeCall,
                new FunctionCallStmt(
                    "range",
                    [new Argument([DataType.Number], "start", false), new Argument([DataType.Number], "end", false)],
                    DataType.NumberList
                ),
            ],
            [
                ConstructKeys.LenCall,
                new FunctionCallStmt(
                    "len",
                    [
                        new Argument(
                            [DataType.AnyList, DataType.StringList, DataType.BooleanList, DataType.NumberList],
                            "list",
                            false
                        ),
                    ],
                    DataType.Number
                ),
            ],
            [ConstructKeys.StringLiteral, new LiteralValExpr(DataType.String)],
            [ConstructKeys.NumberLiteral, new LiteralValExpr(DataType.Number)],
            [ConstructKeys.True, new LiteralValExpr(DataType.Boolean, "True")],
            [ConstructKeys.False, new LiteralValExpr(DataType.Boolean, "False")],
            [ConstructKeys.Addition, new BinaryOperatorExpr(BinaryOperator.Add, DataType.Any)],
            [ConstructKeys.Subtraction, new BinaryOperatorExpr(BinaryOperator.Subtract, DataType.Any)],
            [ConstructKeys.Multiplication, new BinaryOperatorExpr(BinaryOperator.Multiply, DataType.Any)],
            [ConstructKeys.Division, new BinaryOperatorExpr(BinaryOperator.Divide, DataType.Any)],
            [ConstructKeys.And, new BinaryOperatorExpr(BinaryOperator.And, DataType.Boolean)],
            [ConstructKeys.Or, new BinaryOperatorExpr(BinaryOperator.Or, DataType.Boolean)],
            [ConstructKeys.Not, new UnaryOperatorExpr(UnaryOp.Not, DataType.Boolean, DataType.Boolean)],
            [ConstructKeys.Equals, new BinaryOperatorExpr(BinaryOperator.Equal, DataType.Boolean)],
            [ConstructKeys.NotEquals, new BinaryOperatorExpr(BinaryOperator.NotEqual, DataType.Boolean)],
            [ConstructKeys.LessThan, new BinaryOperatorExpr(BinaryOperator.LessThan, DataType.Boolean)],
            [ConstructKeys.LessThanOrEqual, new BinaryOperatorExpr(BinaryOperator.LessThanEqual, DataType.Boolean)],
            [ConstructKeys.GreaterThan, new BinaryOperatorExpr(BinaryOperator.GreaterThan, DataType.Boolean)],
            [
                ConstructKeys.GreaterThanOrEqual,
                new BinaryOperatorExpr(BinaryOperator.GreaterThanEqual, DataType.Boolean),
            ],
            [ConstructKeys.While, new WhileStatement()],
            [ConstructKeys.If, new IfStatement()],
            [ConstructKeys.Elif, new ElseStatement(true)],
            [ConstructKeys.Else, new ElseStatement(false)],
            [ConstructKeys.For, new ForStatement()],
            [ConstructKeys.ListLiteral, new ListLiteralExpression()],
            [ConstructKeys.AppendCall, new MethodCallStmt("append", [new Argument([DataType.Any], "object", false)])],
            [ConstructKeys.MemberCall, new MemberCallStmt(DataType.AnyList)],
            [
                ConstructKeys.SplitCall,
                new MethodCallExpr(
                    "split",
                    [new Argument([DataType.String], "sep", false)],
                    DataType.StringList,
                    DataType.String
                ),
            ],
            [
                ConstructKeys.JoinCall,
                new MethodCallExpr(
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
            ],
            [
                ConstructKeys.ReplaceCall,
                new MethodCallExpr(
                    "replace",
                    [new Argument([DataType.String], "old", false), new Argument([DataType.String], "new", false)],
                    DataType.String,
                    DataType.String
                ),
            ],
            [
                ConstructKeys.FindCall,
                new MethodCallExpr(
                    "find",
                    [new Argument([DataType.String], "item", false)],
                    DataType.Number,
                    DataType.String
                ),
            ],
            [ConstructKeys.ListElementAssignment, new ListElementAssignment()],
        ]);

        ///

        this.constructActions = new Map<ConstructKeys, Function>([
            [
                ConstructKeys.VariableAssignment,
                () => {
                    this.module.insert(new VarAssignmentStmt());
                },
            ],
            [
                ConstructKeys.PrintCall,
                () => {
                    this.module.insert(
                        new FunctionCallStmt("print", [new Argument([DataType.Any], "item", false)], DataType.Void)
                    );
                },
            ],
            [
                ConstructKeys.RandintCall,
                () => {
                    this.module.insert(
                        new FunctionCallStmt(
                            "randint",
                            [
                                new Argument([DataType.Number], "start", false),
                                new Argument([DataType.Number], "end", false),
                            ],
                            DataType.Number
                        )
                    );
                },
            ],
            [
                ConstructKeys.RangeCall,
                () => {
                    this.module.insert(
                        new FunctionCallStmt(
                            "range",
                            [
                                new Argument([DataType.Number], "start", false),
                                new Argument([DataType.Number], "end", false),
                            ],
                            DataType.NumberList
                        )
                    );
                },
            ],
            [
                ConstructKeys.LenCall,
                () => {
                    this.module.insert(
                        new FunctionCallStmt(
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
                        )
                    );
                },
            ],
            [
                ConstructKeys.StringLiteral,
                () => {
                    this.module.insert(new LiteralValExpr(DataType.String));
                },
            ],
            [
                ConstructKeys.NumberLiteral,
                () => {
                    this.module.insert(new LiteralValExpr(DataType.Number));
                },
            ],
            [
                ConstructKeys.True,
                () => {
                    this.module.insert(new LiteralValExpr(DataType.Boolean, "True"));
                },
            ],
            [
                ConstructKeys.False,
                () => {
                    this.module.insert(new LiteralValExpr(DataType.Boolean, "False"));
                },
            ],
            [
                ConstructKeys.Addition,
                () => {
                    this.module.insert(new BinaryOperatorExpr(BinaryOperator.Add, DataType.Any));
                },
            ],
            [
                ConstructKeys.Subtraction,
                () => {
                    this.module.insert(new BinaryOperatorExpr(BinaryOperator.Subtract, DataType.Any));
                },
            ],
            [
                ConstructKeys.Multiplication,
                () => {
                    this.module.insert(new BinaryOperatorExpr(BinaryOperator.Multiply, DataType.Any));
                },
            ],
            [
                ConstructKeys.Division,
                () => {
                    this.module.insert(new BinaryOperatorExpr(BinaryOperator.Divide, DataType.Any));
                },
            ],
            [
                ConstructKeys.And,
                () => {
                    this.module.insert(new BinaryOperatorExpr(BinaryOperator.And, DataType.Boolean));
                },
            ],
            [
                ConstructKeys.Or,
                () => {
                    this.module.insert(new BinaryOperatorExpr(BinaryOperator.Or, DataType.Boolean));
                },
            ],
            [
                ConstructKeys.Not,
                () => {
                    this.module.insert(new UnaryOperatorExpr(UnaryOp.Not, DataType.Boolean, DataType.Boolean));
                },
            ],
            [
                ConstructKeys.Equals,
                () => {
                    this.module.insert(new BinaryOperatorExpr(BinaryOperator.Equal, DataType.Boolean));
                },
            ],
            [
                ConstructKeys.NotEquals,
                () => {
                    this.module.insert(new BinaryOperatorExpr(BinaryOperator.NotEqual, DataType.Boolean));
                },
            ],
            [
                ConstructKeys.LessThan,
                () => {
                    this.module.insert(new BinaryOperatorExpr(BinaryOperator.LessThan, DataType.Boolean));
                },
            ],
            [
                ConstructKeys.LessThanOrEqual,
                () => {
                    this.module.insert(new BinaryOperatorExpr(BinaryOperator.LessThanEqual, DataType.Boolean));
                },
            ],
            [
                ConstructKeys.GreaterThan,
                () => {
                    this.module.insert(new BinaryOperatorExpr(BinaryOperator.GreaterThan, DataType.Boolean));
                },
            ],
            [
                ConstructKeys.GreaterThanOrEqual,
                () => {
                    this.module.insert(new BinaryOperatorExpr(BinaryOperator.GreaterThanEqual, DataType.Boolean));
                },
            ],
            [
                ConstructKeys.While,
                () => {
                    this.module.insert(new WhileStatement());
                },
            ],
            [
                ConstructKeys.If,
                () => {
                    this.module.insert(new IfStatement());
                },
            ],
            [
                ConstructKeys.Elif,
                () => {
                    this.module.insert(new ElseStatement(true));
                },
            ],
            [
                ConstructKeys.Else,
                () => {
                    this.module.insert(new ElseStatement(false));
                },
            ],
            [
                ConstructKeys.For,
                () => {
                    this.module.insert(new ForStatement());
                },
            ],
            [
                ConstructKeys.ListLiteral,
                () => {
                    this.module.insert(new ListLiteralExpression());
                },
            ],
            [
                ConstructKeys.AppendCall,
                () => {
                    this.module.insert(new MethodCallStmt("append", [new Argument([DataType.Any], "object", false)]));
                },
            ],
            [
                ConstructKeys.MemberCall,
                () => {
                    this.module.insert(new MemberCallStmt(DataType.AnyList));
                },
            ],
            [
                ConstructKeys.SplitCall,
                () => {
                    this.module.insert(
                        new MethodCallExpr(
                            "split",
                            [new Argument([DataType.String], "sep", false)],
                            DataType.StringList,
                            DataType.String
                        )
                    );
                },
            ],
            [
                ConstructKeys.JoinCall,
                () => {
                    this.module.insert(
                        new MethodCallExpr(
                            "join",
                            [
                                new Argument(
                                    [DataType.AnyList, DataType.StringList, DataType.BooleanList, DataType.NumberList],
                                    "items",
                                    false
                                ),
                            ],
                            DataType.String,
                            DataType.String
                        )
                    );
                },
            ],
            [
                ConstructKeys.ReplaceCall,
                () => {
                    this.module.insert(
                        new MethodCallExpr(
                            "replace",
                            [
                                new Argument([DataType.String], "old", false),
                                new Argument([DataType.String], "new", false),
                            ],
                            DataType.String,
                            DataType.String
                        )
                    );
                },
            ],
            [
                ConstructKeys.FindCall,
                () => {
                    this.module.insert(
                        new MethodCallExpr(
                            "find",
                            [new Argument([DataType.String], "item", false)],
                            DataType.Number,
                            DataType.String
                        )
                    );
                },
            ],
            [
                ConstructKeys.ListElementAssignment,
                () => {
                    this.module.insert(new ListElementAssignment());
                },
            ],
        ]);

        this.constructDocs = new Map<string, ConstructDoc>([
            [
                ConstructKeys.PrintCall,
                new ConstructDoc("Function: " + ConstructKeys.PrintCall, "Outputs argument to stdout.", []),
            ], //['./src/res/img/cat1.jpg','./src/res/img/cat2.jpg', './src/res/img/cat3.jpg', './src/res/img/cat4.jpg', './src/res/img/cat5.jpg']
        ]);
    }

    static getInstance(module: Module) {
        if (!Util.instance) Util.instance = new Util(module);

        return Util.instance;
    }

    static getPopulatedInstance() {
        return Util.instance;
    }
}

/**
 * Return whether list1 contains at least one item from list2.
 */
export function hasMatch(list1: any[], list2: any[]): boolean {
    if (list2.length == 0 || list1.length == 0) return false;

    for (const item of list2) {
        if (list1.indexOf(item) > -1) return true;
    }

    return false;
}

/**
 * Creates empty spaces based on the given count.
 */
export function emptySpaces(count: number): string {
    let spaces = "";

    for (let i = 0; i < count; i++) spaces += " ";

    return spaces;
}
