import {Argument, BinaryBoolOperatorExpr, BinaryOperator, BinaryOperatorExpr, BoolOperator, CodeConstruct,
        ComparatorExpr, ComparatorOp, DataType, ElseStatement, ForStatement, FunctionCallStmt, IfStatement,
        ListLiteralExpression, LiteralValExpr, MemberCallStmt, MethodCallExpr, MethodCallStmt,
        UnaryOp, UnaryOperatorExpr, VarAssignmentStmt, WhileStatement
} from "../syntax-tree/ast"

export const constructKeys = [
    "VarAssign", "print()", "randint()", "range()", "len()", "string", "int", "True", "False",
    "+", "-", "*", "/", "And", "Or", "Not", "==", "!=", "<", "<=", ">", ">=", "while", 
    "If",  "Elif",  "Else", "For", "List Literal []", ".append()", "Member Call?", ".split()", ".join()", 
    ".replace()", ".find()"
]

export class Util{
    private static instance: Util;

    dummyConstructs: Map<string, CodeConstruct>;
    
    private constructor(){
        //this cannot exist on its own, need to wrap it in a class. Otherwise it does not see the imports for the construct classes.
        this.dummyConstructs = new Map<string, CodeConstruct>([
            ["VarAssign", new VarAssignmentStmt()],
            ["print()", new FunctionCallStmt('print', [ new Argument(DataType.Any, 'item', false) ], DataType.Void)],
            
            ["randint()", new FunctionCallStmt(
                'randint',
                [
                    new Argument(DataType.Number, 'start', false),
                    new Argument(DataType.Number, 'end', false)
                ],
                DataType.Number
            )],
    
            ["range()", new FunctionCallStmt(
                'range',
                [
                    new Argument(DataType.Number, 'start', false),
                    new Argument(DataType.Number, 'end', false)
                ],
                DataType.List
            )],
    
            ["len()", new FunctionCallStmt(
                'len',
                [ new Argument(DataType.List, 'list', false) ],
                DataType.Number
            )],
    
            ["string", new LiteralValExpr(DataType.String)],
    
            ["int", new LiteralValExpr(DataType.Number)],
    
            ["True", new LiteralValExpr(DataType.Boolean , 'True' )],
    
            ["False", new LiteralValExpr(DataType.Boolean, 'False')],
    
            ["+", new BinaryOperatorExpr(BinaryOperator.Add, DataType.Any)],
    
            ["-", new BinaryOperatorExpr(BinaryOperator.Subtract, DataType.Any)],
    
            ["*", new BinaryOperatorExpr(BinaryOperator.Multiply, DataType.Any)],
    
            ["/", new BinaryOperatorExpr(BinaryOperator.Divide, DataType.Any)],
    
            ["And", new BinaryBoolOperatorExpr(BoolOperator.And)],
    
            ["Or", new BinaryBoolOperatorExpr(BoolOperator.Or)],
    
            ["Not", new UnaryOperatorExpr(UnaryOp.Not, DataType.Boolean,  DataType.Boolean)],
    
            ["==", new ComparatorExpr(ComparatorOp.Equal)],
    
            ["!=", new ComparatorExpr(ComparatorOp.NotEqual)],
    
            ["<", new ComparatorExpr(ComparatorOp.LessThan)],
    
            ["<=", new ComparatorExpr(ComparatorOp.LessThanEqual)],
    
            [">", new ComparatorExpr(ComparatorOp.GreaterThan)],
    
            [">=", new ComparatorExpr(ComparatorOp.GreaterThanEqual)],
    
            ["while", new WhileStatement()],
    
            ["If", new IfStatement()],
    
            ["Elif", new ElseStatement(true)],
    
            ["Else", new ElseStatement(false)],
    
            ["For", new ForStatement()],
    
            ["List Literal []", new ListLiteralExpression()],
    
            [".append()", new MethodCallStmt('append', [ new Argument(DataType.Any, 'object', false) ])],
    
            ["Member Call?",new MemberCallStmt(DataType.Any)],
    
            [".split()", new MethodCallExpr(
                'split',
                [ new Argument(DataType.String, 'sep', false) ],
                DataType.List,
                DataType.String
            )],
    
            [".join()", new MethodCallExpr(
                'join',
                [ new Argument(DataType.List, 'items', false) ],
                DataType.String,
                DataType.String
            )],
    
            [".replace()", new MethodCallExpr(
                'replace',
                [
                    new Argument(DataType.String, 'old', false),
                    new Argument(DataType.String, 'new', false)
                ],
                DataType.String,
                DataType.String
            )],
    
            [".find()", new MethodCallExpr(
                'find',
                [ new Argument(DataType.String, 'item', false) ],
                DataType.Number,
                DataType.String
            )]
        ])
    }

    static getInstance(){
        if(!Util.instance){
            Util.instance = new Util;
        }
        return Util.instance;
    }
}