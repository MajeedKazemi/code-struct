import Editor from "../editor/editor";
import { Argument, BinaryBoolOperatorExpr, BinaryOperator, BinaryOperatorExpr, BoolOperator, CodeConstruct, ComparatorExpr, ComparatorOp, DataType, ElseStatement, ForStatement, FunctionCallStmt, IfStatement, ListLiteralExpression, LiteralValExpr, MemberCallStmt, MethodCallExpr, MethodCallStmt, Module, UnaryOp, UnaryOperatorExpr, VarAssignmentStmt, WhileStatement } from "../syntax-tree/ast";


export class SuggestionsController{

    private insertCallbacks = new Map<string, Function>([
        ["VarAssign", () => {this.module.insert(new VarAssignmentStmt())}],
        ["print()", () => {this.module.insert(new FunctionCallStmt('print', [ new Argument(DataType.Any, 'item', false) ], DataType.Void))}],
        
        ["randint()", () => {this.module.insert( new FunctionCallStmt(
            'randint',
            [
                new Argument(DataType.Number, 'start', false),
                new Argument(DataType.Number, 'end', false)
            ],
            DataType.Number
        ))}],

        ["range()", () => {this.module.insert(new FunctionCallStmt(
            'range',
            [
                new Argument(DataType.Number, 'start', false),
                new Argument(DataType.Number, 'end', false)
            ],
            DataType.List
        ))}],

        ["len()", () => {this.module.insert(new FunctionCallStmt(
            'len',
            [ new Argument(DataType.List, 'list', false) ],
            DataType.Number
        ))}],

        ["string", () => {this.module.insert(new LiteralValExpr(DataType.String))}],

        ["int", () => {this.module.insert(new LiteralValExpr(DataType.Number))}],

        ["True", () => {this.module.insert(new LiteralValExpr(DataType.Boolean , 'True' ))}],

        ["False", () => {this.module.insert(new LiteralValExpr(DataType.Boolean, 'False'))}],

        ["+", () => {this.module.insert(new BinaryOperatorExpr(BinaryOperator.Add, DataType.Any))}],

        ["-", () => {this.module.insert(new BinaryOperatorExpr(BinaryOperator.Subtract, DataType.Any))}],

        ["*", () => {this.module.insert(new BinaryOperatorExpr(BinaryOperator.Multiply, DataType.Any))}],

        ["/", () => {this.module.insert(new BinaryOperatorExpr(BinaryOperator.Divide, DataType.Any))}],

        ["And", () => {this.module.insert(new BinaryBoolOperatorExpr(BoolOperator.And))}],

        ["Or", () => {this.module.insert(new BinaryBoolOperatorExpr(BoolOperator.Or))}],

        ["Not", () => {this.module.insert(new UnaryOperatorExpr(UnaryOp.Not, DataType.Boolean,  DataType.Boolean))}],

        ["==", () => {this.module.insert(new ComparatorExpr(ComparatorOp.Equal))}],

        ["!=", () => {this.module.insert(new ComparatorExpr(ComparatorOp.NotEqual))}],

        ["<", () => {this.module.insert(new ComparatorExpr(ComparatorOp.LessThan))}],

        ["<=", () => {this.module.insert(new ComparatorExpr(ComparatorOp.LessThanEqual))}],

        [">", () => {this.module.insert(new ComparatorExpr(ComparatorOp.GreaterThan))}],

        [">=", () => {this.module.insert(new ComparatorExpr(ComparatorOp.GreaterThanEqual))}],

        ["while", () => {this.module.insert(new WhileStatement())}],

        ["If", () => {this.module.insert(new IfStatement())}],

        ["Elif", () => {this.module.insert(new ElseStatement(true))}],

        ["Else", () => {this.module.insert(new ElseStatement(false))}],

        ["For", () => {this.module.insert(new ForStatement())}],

        ["List Literal []", () => {this.module.insert(new ListLiteralExpression())}],

        [".append()", () => {this.module.insert(new MethodCallStmt('append', [ new Argument(DataType.Any, 'object', false) ]))}],

        ["Member Call?", () => {this.module.insert(new MemberCallStmt(DataType.Any))}],

        [".split()", () => {this.module.insert(new MethodCallExpr(
            'split',
            [ new Argument(DataType.String, 'sep', false) ],
            DataType.List,
            DataType.String
        ))}],

        [".join()", () => {this.module.insert(new MethodCallExpr(
            'join',
            [ new Argument(DataType.List, 'items', false) ],
            DataType.String,
            DataType.String
        ))}],

        [".replace()", () => {this.module.insert(new MethodCallExpr(
            'replace',
            [
                new Argument(DataType.String, 'old', false),
                new Argument(DataType.String, 'new', false)
            ],
            DataType.String,
            DataType.String
        ))}],

        [".find()", () => {this.module.insert(new MethodCallExpr(
            'find',
            [ new Argument(DataType.String, 'item', false) ],
            DataType.Number,
            DataType.String
        ))}]
    ])

    private static instance: SuggestionsController

    module: Module;
    editor: Editor;

    menuParent: HTMLDivElement;

    private constructor(){}

    static getInstance(){
        if(!SuggestionsController.instance){
            SuggestionsController.instance = new SuggestionsController();
        }

        return SuggestionsController.instance;
    }

    setInstance(module: Module, editor: Editor){
        this.module = module;
        this.editor = editor;
    }

    buildMenu(inserts: Map<string, boolean>, keys: Array<string>, pos: any){
        this.menuParent = document.createElement("div");
        this.menuParent.classList.add("suggestionMenuParent");

        keys.forEach(key => {
            if(inserts.get(key)){
                const option = document.createElement("button");
                option.textContent = key;
                option.addEventListener("click", () => {this.insertCallbacks.get(key)()})
                option.classList.add("suggestionOption");
                this.menuParent.appendChild(option)
            }
        })

        //TODO: These are the same values as the ones used for mouse offset by the Notifications so maybe make them shared in some util file
        this.menuParent.style.left = `${pos.left + document.getElementById("editor").offsetLeft}px`;
        this.menuParent.style.top = `${pos.top + parseFloat(window.getComputedStyle(document.getElementById("editor")).paddingTop)}px`;

        document.getElementById("editor").appendChild(this.menuParent);
    }

    removeMenu(){
        document.getElementById("editor").removeChild(this.menuParent);
        this.menuParent = null;
    }
}