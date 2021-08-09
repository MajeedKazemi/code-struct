import { Module } from "../syntax-tree/module";
import { EditAction } from "../editor/data-types";
import { EditActionType } from "../editor/consts";
import { ConstructDoc } from "../suggestions/construct-doc";
import { BinaryOperator, DataType, UnaryOp } from "./../syntax-tree/consts";
import {
    Argument,
    CodeConstruct,
    ForStatement,
    FunctionCallStmt,
    IfStatement,
    ListElementAssignment,
    ListLiteralExpression,
    MemberCallStmt,
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

export class Util {
    private static instance: Util;

    dummyToolboxConstructs: Map<string, CodeConstruct>;
    constructActions: Map<string, Function>;
    constructDocs: Map<string, ConstructDoc>;
    typeConversionMap: Map<DataType, Array<DataType>>;
    module: Module;

    private constructor(module?: Module) {
        if (module) {
            this.module = module;
        }

        const context = this.module.focus.getContext();

        //these cannot exist on their own, need to wrap them in a class. Otherwise they does not see the imports for the construct classes.

        //stores information about what types an object or literal of a given type can be converted to either through casting or
        //some other manipulation such as [number] or number === --- or accessing some property such as list.length > 0
        this.typeConversionMap = new Map<DataType, Array<DataType>>([
            [DataType.Void, []],
            [DataType.Number, [DataType.String, DataType.NumberList, DataType.Boolean]],
            [DataType.String, [DataType.StringList, DataType.Boolean]],
            [DataType.Boolean, [DataType.BooleanList]],
            [DataType.AnyList, [DataType.Boolean]],
            [DataType.NumberList, [DataType.Boolean]],
            [DataType.BooleanList, [DataType.Boolean]],
            [DataType.StringList, [DataType.Boolean]],
            [DataType.Any, [DataType.Boolean, DataType.Number, DataType.String, DataType.AnyList]],
        ]);

        this.constructActions = new Map<ConstructKeys, Function>([
            [
                ConstructKeys.VariableAssignment,
                () => {
                    this.module.executer.execute(
                        new EditAction(EditActionType.InsertVarAssignStatement, {
                            statement: new VarAssignmentStmt(),
                        }),
                        context
                    );
                },
            ],
            [
                ConstructKeys.PrintCall,
                () => {
                    this.module.executer.execute(
                        new EditAction(EditActionType.InsertStatement, {
                            statement: new FunctionCallStmt(
                                "print",
                                [new Argument([DataType.Any], "item", false)],
                                DataType.Void
                            ),
                        }),
                        context
                    );
                },
            ],
            [
                ConstructKeys.RandintCall,
                () => {
                    new EditAction(EditActionType.InsertStatement, {
                        statement: new FunctionCallStmt(
                            "randint",
                            [
                                new Argument([DataType.Number], "start", false),
                                new Argument([DataType.Number], "end", false),
                            ],
                            DataType.Number
                        ),
                    });
                },
            ],
            [
                ConstructKeys.RangeCall,
                () => {
                    new EditAction(EditActionType.InsertStatement, {
                        statement: new FunctionCallStmt(
                            "range",
                            [
                                new Argument([DataType.Number], "start", false),
                                new Argument([DataType.Number], "end", false),
                            ],
                            DataType.NumberList
                        ),
                    });
                },
            ],
            [
                ConstructKeys.LenCall,
                () => {
                    const expression = new FunctionCallStmt(
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
                    );

                    if (this.module.validator.atEmptyExpressionHole(context)) {
                        return new EditAction(EditActionType.InsertExpression, {
                            expression,
                        });
                    } else if (this.module.validator.atLeftOfExpression(context)) {
                        return new EditAction(EditActionType.WrapExpressionWithItem, {
                            expression,
                        });
                    }
                },
            ],
            [
                ConstructKeys.StringLiteral,
                () => {
                    return new EditAction(EditActionType.InsertLiteral, {
                        literalType: DataType.String,
                        initialValue: "",
                    });
                },
            ],
            [
                ConstructKeys.NumberLiteral,
                () => {
                    return new EditAction(EditActionType.InsertLiteral, {
                        literalType: DataType.Number,
                        initialValue: 0,
                    });
                },
            ],
            [
                ConstructKeys.True,
                () => {
                    return new EditAction(EditActionType.InsertLiteral, {
                        literalType: DataType.Boolean,
                        initialValue: "True",
                    });
                },
            ],
            [
                ConstructKeys.False,
                () => {
                    return new EditAction(EditActionType.InsertLiteral, {
                        literalType: DataType.Boolean,
                        initialValue: "False",
                    });
                },
            ],
            [
                ConstructKeys.Addition,
                () => {
                    if (this.module.validator.atRightOfExpression(context)) {
                        return new EditAction(EditActionType.InsertBinaryOperator, {
                            toRight: true,
                            operator: BinaryOperator.Add,
                        });
                    } else if (this.module.validator.atLeftOfExpression(context)) {
                        return new EditAction(EditActionType.InsertBinaryOperator, {
                            toLeft: true,
                            operator: BinaryOperator.Add,
                        });
                    } else if (this.module.validator.atEmptyExpressionHole(context)) {
                        return new EditAction(EditActionType.InsertBinaryOperator, {
                            replace: true,
                            operator: BinaryOperator.Add,
                        });
                    }
                },
            ],
            [
                ConstructKeys.Subtraction,
                () => {
                    if (this.module.validator.atRightOfExpression(context)) {
                        return new EditAction(EditActionType.InsertBinaryOperator, {
                            toRight: true,
                            operator: BinaryOperator.Subtract,
                        });
                    } else if (this.module.validator.atLeftOfExpression(context)) {
                        return new EditAction(EditActionType.InsertBinaryOperator, {
                            toLeft: true,
                            operator: BinaryOperator.Subtract,
                        });
                    } else if (this.module.validator.atEmptyExpressionHole(context)) {
                        return new EditAction(EditActionType.InsertBinaryOperator, {
                            replace: true,
                            operator: BinaryOperator.Subtract,
                        });
                    }
                },
            ],
            [
                ConstructKeys.Multiplication,
                () => {
                    if (this.module.validator.atRightOfExpression(context)) {
                        return new EditAction(EditActionType.InsertBinaryOperator, {
                            toRight: true,
                            operator: BinaryOperator.Multiply,
                        });
                    } else if (this.module.validator.atLeftOfExpression(context)) {
                        return new EditAction(EditActionType.InsertBinaryOperator, {
                            toLeft: true,
                            operator: BinaryOperator.Multiply,
                        });
                    } else if (this.module.validator.atEmptyExpressionHole(context)) {
                        return new EditAction(EditActionType.InsertBinaryOperator, {
                            replace: true,
                            operator: BinaryOperator.Multiply,
                        });
                    }
                },
            ],
            [
                ConstructKeys.Division,
                () => {
                    if (this.module.validator.atRightOfExpression(context)) {
                        return new EditAction(EditActionType.InsertBinaryOperator, {
                            toRight: true,
                            operator: BinaryOperator.Divide,
                        });
                    } else if (this.module.validator.atLeftOfExpression(context)) {
                        return new EditAction(EditActionType.InsertBinaryOperator, {
                            toLeft: true,
                            operator: BinaryOperator.Divide,
                        });
                    } else if (this.module.validator.atEmptyExpressionHole(context)) {
                        return new EditAction(EditActionType.InsertBinaryOperator, {
                            replace: true,
                            operator: BinaryOperator.Divide,
                        });
                    }
                },
            ],
            [
                ConstructKeys.And,
                () => {
                    if (this.module.validator.atRightOfExpression(context)) {
                        return new EditAction(EditActionType.InsertBinaryOperator, {
                            toRight: true,
                            operator: BinaryOperator.And,
                        });
                    } else if (this.module.validator.atLeftOfExpression(context)) {
                        return new EditAction(EditActionType.InsertBinaryOperator, {
                            toLeft: true,
                            operator: BinaryOperator.And,
                        });
                    } else if (this.module.validator.atEmptyExpressionHole(context)) {
                        return new EditAction(EditActionType.InsertBinaryOperator, {
                            replace: true,
                            operator: BinaryOperator.And,
                        });
                    }
                },
            ],
            [
                ConstructKeys.Or,
                () => {
                    if (this.module.validator.atRightOfExpression(context)) {
                        return new EditAction(EditActionType.InsertBinaryOperator, {
                            toRight: true,
                            operator: BinaryOperator.Or,
                        });
                    } else if (this.module.validator.atLeftOfExpression(context)) {
                        return new EditAction(EditActionType.InsertBinaryOperator, {
                            toLeft: true,
                            operator: BinaryOperator.Or,
                        });
                    } else if (this.module.validator.atEmptyExpressionHole(context)) {
                        return new EditAction(EditActionType.InsertBinaryOperator, {
                            replace: true,
                            operator: BinaryOperator.Or,
                        });
                    }
                },
            ],
            [
                ConstructKeys.Not,
                () => {
                    if (this.module.validator.atLeftOfExpression(context)) {
                        return new EditAction(EditActionType.InsertUnaryOperator, {
                            wrap: true,
                            operator: UnaryOp.Not,
                        });
                    } else if (this.module.validator.atEmptyExpressionHole(context)) {
                        return new EditAction(EditActionType.InsertUnaryOperator, {
                            replace: true,
                            operator: UnaryOp.Not,
                        });
                    }
                },
            ],
            [
                ConstructKeys.Equals,
                () => {
                    if (this.module.validator.atRightOfExpression(context)) {
                        return new EditAction(EditActionType.InsertBinaryOperator, {
                            toRight: true,
                            operator: BinaryOperator.Equal,
                        });
                    } else if (this.module.validator.atLeftOfExpression(context)) {
                        return new EditAction(EditActionType.InsertBinaryOperator, {
                            toLeft: true,
                            operator: BinaryOperator.Equal,
                        });
                    } else if (this.module.validator.atEmptyExpressionHole(context)) {
                        return new EditAction(EditActionType.InsertBinaryOperator, {
                            replace: true,
                            operator: BinaryOperator.Equal,
                        });
                    }
                },
            ],
            [
                ConstructKeys.NotEquals,
                () => {
                    if (this.module.validator.atRightOfExpression(context)) {
                        return new EditAction(EditActionType.InsertBinaryOperator, {
                            toRight: true,
                            operator: BinaryOperator.NotEqual,
                        });
                    } else if (this.module.validator.atLeftOfExpression(context)) {
                        return new EditAction(EditActionType.InsertBinaryOperator, {
                            toLeft: true,
                            operator: BinaryOperator.NotEqual,
                        });
                    } else if (this.module.validator.atEmptyExpressionHole(context)) {
                        return new EditAction(EditActionType.InsertBinaryOperator, {
                            replace: true,
                            operator: BinaryOperator.NotEqual,
                        });
                    }
                },
            ],
            [
                ConstructKeys.LessThan,
                () => {
                    if (this.module.validator.atRightOfExpression(context)) {
                        return new EditAction(EditActionType.InsertBinaryOperator, {
                            toRight: true,
                            operator: BinaryOperator.LessThan,
                        });
                    } else if (this.module.validator.atLeftOfExpression(context)) {
                        return new EditAction(EditActionType.InsertBinaryOperator, {
                            toLeft: true,
                            operator: BinaryOperator.LessThan,
                        });
                    } else if (this.module.validator.atEmptyExpressionHole(context)) {
                        return new EditAction(EditActionType.InsertBinaryOperator, {
                            replace: true,
                            operator: BinaryOperator.LessThan,
                        });
                    }
                },
            ],
            [
                ConstructKeys.LessThanOrEqual,
                () => {
                    if (this.module.validator.atRightOfExpression(context)) {
                        return new EditAction(EditActionType.InsertBinaryOperator, {
                            toRight: true,
                            operator: BinaryOperator.LessThanEqual,
                        });
                    } else if (this.module.validator.atLeftOfExpression(context)) {
                        return new EditAction(EditActionType.InsertBinaryOperator, {
                            toLeft: true,
                            operator: BinaryOperator.LessThanEqual,
                        });
                    } else if (this.module.validator.atEmptyExpressionHole(context)) {
                        return new EditAction(EditActionType.InsertBinaryOperator, {
                            replace: true,
                            operator: BinaryOperator.LessThanEqual,
                        });
                    }
                },
            ],
            [
                ConstructKeys.GreaterThan,
                () => {
                    if (this.module.validator.atRightOfExpression(context)) {
                        return new EditAction(EditActionType.InsertBinaryOperator, {
                            toRight: true,
                            operator: BinaryOperator.GreaterThan,
                        });
                    } else if (this.module.validator.atLeftOfExpression(context)) {
                        return new EditAction(EditActionType.InsertBinaryOperator, {
                            toLeft: true,
                            operator: BinaryOperator.GreaterThan,
                        });
                    } else if (this.module.validator.atEmptyExpressionHole(context)) {
                        return new EditAction(EditActionType.InsertBinaryOperator, {
                            replace: true,
                            operator: BinaryOperator.GreaterThan,
                        });
                    }
                },
            ],
            [
                ConstructKeys.GreaterThanOrEqual,
                () => {
                    if (this.module.validator.atRightOfExpression(context)) {
                        return new EditAction(EditActionType.InsertBinaryOperator, {
                            toRight: true,
                            operator: BinaryOperator.GreaterThanEqual,
                        });
                    } else if (this.module.validator.atLeftOfExpression(context)) {
                        return new EditAction(EditActionType.InsertBinaryOperator, {
                            toLeft: true,
                            operator: BinaryOperator.GreaterThanEqual,
                        });
                    } else if (this.module.validator.atEmptyExpressionHole(context)) {
                        return new EditAction(EditActionType.InsertBinaryOperator, {
                            replace: true,
                            operator: BinaryOperator.GreaterThanEqual,
                        });
                    }
                },
            ],
            [
                ConstructKeys.While,
                () => {
                    return new EditAction(EditActionType.InsertStatement, {
                        statement: new WhileStatement(),
                    });
                },
            ],
            [
                ConstructKeys.If,
                () => {
                    return new EditAction(EditActionType.InsertStatement, {
                        statement: new IfStatement(),
                    });
                },
            ],
            [
                ConstructKeys.Elif,
                () => {
                    const canInsertAtCurIndent = this.module.validator.canInsertElifStmtAtCurIndent(context);
                    const canInsertAtPrevIndent = this.module.validator.canInsertElifStmtAtPrevIndent(context);

                    // prioritize inserting at current indentation over prev one
                    if (canInsertAtCurIndent || canInsertAtPrevIndent) {
                        return new EditAction(EditActionType.InsertElseStatement, {
                            hasCondition: true,
                            outside: canInsertAtCurIndent,
                        });
                    }
                },
            ],
            [
                ConstructKeys.Else,
                () => {
                    const canInsertAtCurIndent = this.module.validator.canInsertElseStmtAtCurIndent(context);
                    const canInsertAtPrevIndent = this.module.validator.canInsertElseStmtAtPrevIndent(context);

                    // prioritize inserting at current indentation over prev one
                    if (canInsertAtCurIndent || canInsertAtPrevIndent) {
                        return new EditAction(EditActionType.InsertElseStatement, {
                            hasCondition: false,
                            outside: canInsertAtCurIndent,
                        });
                    }
                },
            ],
            [
                ConstructKeys.For,
                () => {
                    return new EditAction(EditActionType.InsertStatement, {
                        statement: new ForStatement(),
                    });
                },
            ],
            [
                ConstructKeys.ListLiteral,
                () => {
                    if (this.module.validator.atLeftOfExpression(context)) {
                        return new EditAction(EditActionType.WrapExpressionWithItem, {
                            expression: new ListLiteralExpression(),
                        });
                    } else if (this.module.validator.atEmptyExpressionHole(context)) {
                        return new EditAction(EditActionType.InsertEmptyList);
                    }
                },
            ],
            [
                ConstructKeys.AppendCall,
                () => {
                    return new EditAction(EditActionType.InsertModifier, {
                        functionName: "append",
                        returns: DataType.Void,
                        args: [new Argument([DataType.Any], "object", false)],
                        exprType: DataType.AnyList,
                    });
                },
            ],
            [
                ConstructKeys.MemberCall,
                () => {
                    return new EditAction(EditActionType.InsertExpression, {
                        expression: new MemberCallStmt(DataType.Any),
                    });
                },
            ],
            [
                ConstructKeys.SplitCall,
                () => {
                    return new EditAction(EditActionType.InsertModifier, {
                        functionName: "split",
                        returns: DataType.StringList,
                        args: [new Argument([DataType.String], "sep", false)],
                        exprType: DataType.String,
                    });
                },
            ],
            [
                ConstructKeys.JoinCall,
                () => {
                    return new EditAction(EditActionType.InsertModifier, {
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
                    });
                },
            ],
            [
                ConstructKeys.ReplaceCall,
                () => {
                    return new EditAction(EditActionType.InsertModifier, {
                        functionName: "replace",
                        returns: DataType.String,
                        args: [
                            new Argument([DataType.String], "old", false),
                            new Argument([DataType.String], "new", false),
                        ],
                        exprType: DataType.String,
                    });
                },
            ],
            [
                ConstructKeys.FindCall,
                () => {
                    return new EditAction(EditActionType.InsertModifier, {
                        functionName: "find",
                        returns: DataType.Number,
                        args: [new Argument([DataType.String], "item", false)],
                        exprType: DataType.String,
                    });
                },
            ],
            [
                ConstructKeys.ListElementAssignment,
                () => {
                    return new EditAction(EditActionType.InsertStatement, {
                        statement: new ListElementAssignment(),
                    });
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

    static getInstance(module?: Module) {
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

export function hasMatchWithIndex<T>(list1: T[], list2: T[]): [number, number] {
    const matchingIndeces: [number, number] = [-1, -1];

    if (list1.length === 0 || list2.length === 0) {
        return matchingIndeces;
    }

    for (let i = 0; i < list2.length; i++) {
        if (list1.indexOf(list2[i]) > -1) {
            matchingIndeces[0] = list1.indexOf(list2[i]);
            matchingIndeces[1] = i;
        }
    }

    return matchingIndeces;
}
