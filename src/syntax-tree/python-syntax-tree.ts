/**
  * an abstract Statement in the syntax-tree
  */
export abstract class Statement {
	root: Statement;

	abstract children(): Array<Statement>;

	hasChildren() {
		return this.children().length != 0;
	}
}

export class Argument {
	name: string;
	type: DataType;

	// there are other
}

export class BodyStmts extends Statement {
	body: Array<Statement>;

	children() {
		return this.body;
	}
}

export class FunctionDefStmt extends Statement {
	identifer: string;
	arguments: Array<Argument>;
	body: BodyStmts;
	returnExpr: Expression;

	// decorators

	children() {
		return [ this.body, this.returnExpr ];
	}
}

export class ForStmt extends Statement {
	target: string;
	// TODO: could potentially have multiple targets (e.g. in zips and dicts)
	iterator: Expression; // of a specific type (any object that implements iterator)
	body: BodyStmts;

	children() {
		return [ this.iterator, this.body ];
	}
}

export class IfStmt extends Statement {
	condition: Expression;
	body: BodyStmts;
	orElse: IfStmt;

	children() {
		return [ this.body, this.orElse ];
	}
}

export class WhileStmt extends Statement {
	condition: Expression;
	body: BodyStmts;
	elseBody: BodyStmts;

	children() {
		return [ this.condition, this.body, this.elseBody ];
	}
}

export class VarAssignStmt extends Statement {
	target: string;
	value: Expression;

	// could warn when the expression's outputType is different from the variable's previous type

	children() {
		return this.value.children();
	}
}

export abstract class Expression extends Statement {
	outputType: DataType;
}

export class BoolOpExpr extends Expression {
	operator: BoolOperator;

	// should have boolean output types
	leftExpr: Expression;
	rightExpr: Expression;

	children() {
		return [ this.leftExpr, this.rightExpr ];
	}
}

export class BinOpExpr extends Expression {
	operator: BinaryOperator;

	// should have the same output types
	leftExpr: Expression;
	rightExpr: Expression;

	children() {
		return [ this.leftExpr, this.rightExpr ];
	}
}

export class UnaryOpExpr extends Expression {
	operator: UnaryOp;
	expr: Expression;

	children() {
		return this.expr.children();
	}
}

export class InlineIfExpr extends Expression {
	// boolean expr
	condition: Expression;

	// could have different output types (Python allows dynamic types)
	trueExpr: Expression;
	falseExpr: Expression;

	children() {
		return [ this.trueExpr, this.falseExpr ];
	}
}

export class CompareExpr extends Expression {
	operator: ComparatorOp;

	// should have the same output types (and could not be any type)
	leftExpr: Expression;
	rightExpr: Expression;

	children() {
		return [ this.leftExpr, this.rightExpr ];
	}
}

export class CallFunctionExpr extends Expression {
	functionName: string;
	arguments: Array<Expression>;

	constructor(functionName: string) {
		super();

		this.functionName = functionName;
	}

	children() {
		return this.arguments;
	}
}

export class ConstantExpr extends Expression {
	value: any;

	children() {
		return [];
	}
}

export enum DataType {
	Number,
	Boolean,
	Text,
	Fractional,
	List,
	Set,
	Dict,
	Class,
	Void
}

export enum BoolOperator {
	And,
	Or
}

export enum BinaryOperator {
	Add,
	Sub,
	Mult,
	Div,
	Mod,
	Pow,
	LeftShift,
	RightShift,
	BitOr,
	BitXor,
	BitAnd,
	FloorDiv
}

export enum UnaryOp {
	Invert,
	Not,
	UAdd,
	USub
}

export enum ComparatorOp {
	Equal,
	NotEqual,
	LessThan,
	LessThanEqual,
	GreaterThan,
	GreaterThanEqual,
	Is,
	IsNot,
	In,
	NotIn
}
