import { ConstructDoc } from "../suggestions/construct-doc";
import {Argument, BinaryBoolOperatorExpr, BinaryOperator, BinaryOperatorExpr, BoolOperator, CodeConstruct,
        ComparatorExpr, ComparatorOp, DataType, ElseStatement, ForStatement, FunctionCallStmt, IfStatement,
        ListLiteralExpression, LiteralValExpr, MemberCallStmt, MethodCallExpr, MethodCallStmt,
        UnaryOp, UnaryOperatorExpr, VarAssignmentStmt, WhileStatement
} from "../syntax-tree/ast"


/**
 * IMPORTANT!!!
 * 
 * constructKeys and ConstructKeys need to have the same values. 
 * 
 * The enum is that we can get a dummy construct anywhere in the code.
 * The list is so that we can loop over all dumy constructs since Map does not have a public keys property.
 * 
 * In regular JS we could always call Object.keys(ConstructKeys), but not in TS.
 */
export const constructKeys = [
    "VarAssign", "print()", "randint()", "range()", "len()", "string", "int", "True", "False",
    "+", "-", "*", "/", "And", "Or", "Not", "==", "!=", "<", "<=", ">", ">=", "while", 
    "If",  "Elif",  "Else", "For", "List Literal []", ".append()", "Member Call?", ".split()", ".join()", 
    ".replace()", ".find()"
]

export const enum ConstructKeys{
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
    Subtracion = "-",
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
    GreaterThenOrEqual = ">=",
    While = "while",
    If = "if",
    Elif = "elif",
    Else = "else",
    For = "For",
    ListLiteral = "Lister Literal",
    AppendCall = ".append()",
    SplitCall = ".split()",
    JoinCall = ".join()",
    ReplaceCall = ".replace()",
    FindCall = ".find()",
    MemberCall = "Member Call ?"
}

export class Util{
    private static instance: Util;

    dummyToolboxConstructs: Map<string, CodeConstruct>;
    constructDocs: Map<string, ConstructDoc>;
    
    private constructor(){
        //this cannot exist on its own, need to wrap it in a class. Otherwise it does not see the imports for the construct classes.
        this.dummyToolboxConstructs = new Map<string, CodeConstruct>([
            [ConstructKeys.VariableAssignment, new VarAssignmentStmt()],
            [ConstructKeys.PrintCall, new FunctionCallStmt('print', [ new Argument(DataType.Any, 'item', false) ], DataType.Void)],
            
            [ConstructKeys.RandintCall, new FunctionCallStmt(
                'randint',
                [
                    new Argument(DataType.Number, 'start', false),
                    new Argument(DataType.Number, 'end', false)
                ],
                DataType.Number
            )],
    
            [ConstructKeys.RangeCall, new FunctionCallStmt(
                'range',
                [
                    new Argument(DataType.Number, 'start', false),
                    new Argument(DataType.Number, 'end', false)
                ],
                DataType.List
            )],
    
            [ConstructKeys.LenCall, new FunctionCallStmt(
                'len',
                [ new Argument(DataType.List, 'list', false) ],
                DataType.Number
            )],
    
            [ConstructKeys.StringLiteral, new LiteralValExpr(DataType.String)],
    
            [ConstructKeys.NumberLiteral, new LiteralValExpr(DataType.Number)],
    
            [ConstructKeys.True, new LiteralValExpr(DataType.Boolean , 'True' )],
    
            [ConstructKeys.False, new LiteralValExpr(DataType.Boolean, 'False')],
    
            [ConstructKeys.Addition, new BinaryOperatorExpr(BinaryOperator.Add, DataType.Any)],
    
            [ConstructKeys.Subtracion, new BinaryOperatorExpr(BinaryOperator.Subtract, DataType.Any)],
    
            [ConstructKeys.Multiplication, new BinaryOperatorExpr(BinaryOperator.Multiply, DataType.Any)],
    
            [ConstructKeys.Division, new BinaryOperatorExpr(BinaryOperator.Divide, DataType.Any)],
    
            [ConstructKeys.And, new BinaryBoolOperatorExpr(BoolOperator.And)],
    
            [ConstructKeys.Or, new BinaryBoolOperatorExpr(BoolOperator.Or)],
    
            [ConstructKeys.Not, new UnaryOperatorExpr(UnaryOp.Not, DataType.Boolean,  DataType.Boolean)],
    
            [ConstructKeys.Equals, new ComparatorExpr(ComparatorOp.Equal)],
    
            [ConstructKeys.NotEquals, new ComparatorExpr(ComparatorOp.NotEqual)],
    
            [ConstructKeys.LessThan, new ComparatorExpr(ComparatorOp.LessThan)],
    
            [ConstructKeys.LessThanOrEqual, new ComparatorExpr(ComparatorOp.LessThanEqual)],
    
            [ConstructKeys.GreaterThan, new ComparatorExpr(ComparatorOp.GreaterThan)],
    
            [ConstructKeys.GreaterThenOrEqual, new ComparatorExpr(ComparatorOp.GreaterThanEqual)],
    
            [ConstructKeys.While, new WhileStatement()],
    
            [ConstructKeys.If, new IfStatement()],
    
            [ConstructKeys.Elif, new ElseStatement(true)],
    
            [ConstructKeys.Else, new ElseStatement(false)],
    
            [ConstructKeys.False, new ForStatement()],
    
            [ConstructKeys.ListLiteral, new ListLiteralExpression()],
    
            [ConstructKeys.AppendCall, new MethodCallStmt('append', [ new Argument(DataType.Any, 'object', false) ])],
    
            [ConstructKeys.MemberCall, new MemberCallStmt(DataType.Any)],
    
            [ConstructKeys.SplitCall, new MethodCallExpr(
                'split',
                [ new Argument(DataType.String, 'sep', false) ],
                DataType.List,
                DataType.String
            )],
    
            [ConstructKeys.JoinCall, new MethodCallExpr(
                'join',
                [ new Argument(DataType.List, 'items', false) ],
                DataType.String,
                DataType.String
            )],
    
            [ConstructKeys.ReplaceCall, new MethodCallExpr(
                'replace',
                [
                    new Argument(DataType.String, 'old', false),
                    new Argument(DataType.String, 'new', false)
                ],
                DataType.String,
                DataType.String
            )],
    
            [ConstructKeys.FindCall, new MethodCallExpr(
                'find',
                [ new Argument(DataType.String, 'item', false) ],
                DataType.Number,
                DataType.String
            )]
        ])

        this.constructDocs = new Map<string, ConstructDoc>([
            [ConstructKeys.PrintCall, new ConstructDoc("Function: " + ConstructKeys.PrintCall, "Outputs argument to stdout.",  ['./src/res/img/cat1.jpg','./src/res/img/cat2.jpg', './src/res/img/cat3.jpg', './src/res/img/cat4.jpg', './src/res/img/cat5.jpg'])]
        ])
    }

    static getInstance(){
        if(!Util.instance){
            Util.instance = new Util;
        }
        return Util.instance;
    }
}