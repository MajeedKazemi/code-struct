import { Position } from 'monaco-editor';

export enum DataType {
	Number,
	Boolean,
	Text,
	Fractional,
	Iterator,
	List,
	Set,
	Dict,
	Class,
	Void,
	Any
}

export enum BinaryOperator {
	Add = '+',
	Subtract = '-',
	Multiply = '*',
	Divide = '/',
	Mod = '%',
	Pow = '**',
	LeftShift = '<<',
	RightShift = '>>',
	BitOr = '|',
	BitXor = '^',
	BitAnd = '&',
	FloorDiv = '//'
}

export enum UnaryOp {
	Invert = '~',
	Not = 'not',
	UAdd = '+',
	USub = '-'
}

export enum ComparatorOp {
	Equal = '==',
	NotEqual = '!=',
	LessThan = '<',
	LessThanEqual = '<=',
	GreaterThan = '>',
	GreaterThanEqual = '>=',
	Is = 'is',
	IsNot = 'is not',
	In = 'in',
	NotIn = 'not in'
}

export enum NodeType {
	Token,
	Expression,
	Statement
}

export interface CodeConstruct {
	left: number;
	right: number;

	build(pos: Position): Position;
	locate(pos: Position): CodeConstruct;
	contains(pos: Position): boolean;
}

/**
 * A node element inside a tree structure
 */
export interface Node {
	nodeType: NodeType;
	rootNode: Node;
	indexInRoot: number;
}

/**
 * A complete code statement such as: variable assignment, function call, conditional, loop, function definition, and other statements.
 */
export abstract class Statement implements CodeConstruct, Node {
	nodeType = NodeType.Statement;
	rootNode: Node = null;
	indexInRoot: number;

	// TODO: might want to change this to first, and last nodes? or a function that calculates left and right based on those two
	lineNumber: number;
	left: number;
	right: number;

	tokens = new Array<Node>();

	/**
	 * Builds the left and right positions of this node and all of its children nodes recursively.
	 * @param pos the left position to start building the nodes from
	 * @returns the final right position of the whole node (calculated after building all of the children nodes)
	 */
	build(pos: Position): Position {
		this.lineNumber = pos.lineNumber;
		this.left = pos.column;
		var curPos = pos;

		for (let i = 0; i < this.tokens.length; i++) {
			let node = this.tokens[i];

			if (node.nodeType == NodeType.Token) curPos = (node as Token).build(curPos);
			else curPos = (node as Expression).build(curPos);
		}

		this.right = curPos.column - 1;

		return curPos;
	}

	/**
	 * Rebuilds the left and right positions of this node recursively. Optimized to not rebuild untouched nodes.
	 * @param pos the left position to start building the nodes from
	 * @param fromIndex the index of the node that was edited.
	 */
	rebuild(pos: Position, fromIndex: number) {
		let curPos = pos;
		let propagateToRoot = true;

		// rebuild siblings:
		for (let i = fromIndex; i < this.tokens.length; i++) {
			if (this.tokens[i].nodeType == NodeType.Token) curPos = (this.tokens[i] as Token).build(curPos);
			else {
				curPos = (this.tokens[i] as Expression).build(curPos);
			}

			if (i == fromIndex && i + 1 < this.tokens.length) {
				// has siblings
				let firstSiblingLeft: number;

				if (this.tokens[i].nodeType == NodeType.Token) firstSiblingLeft = (this.tokens[i + 1] as Token).left;
				else firstSiblingLeft = (this.tokens[i + 1] as Expression).left;

				if (firstSiblingLeft == curPos.column) {
					propagateToRoot = false;
					break;
				}
			}
		}

		let newRight = curPos.column - 1;

		if (propagateToRoot && this.right != newRight) {
			this.right = newRight;

			// check if parent's siblings should be rebuilt
			if (this.rootNode && this.indexInRoot)
				if (this.rootNode.nodeType == NodeType.Expression) {
					(this.rootNode as Expression).rebuild(curPos, this.indexInRoot + 1);
				} else console.warn('node did not have rootNode or indexInRoot: ', this.tokens);
		}
	}

	/**
	 * Checks if this node contains the given position (as a 2D point)
	 * @param pos the 2D point to check
	 * @returns true: contains, false: does not contain
	 */
	contains(pos: Position): boolean {
		if (pos.lineNumber != this.lineNumber) return false;

		if (pos.column >= this.left && pos.column <= this.right) return true;

		return false;
	}

	/**
	 * Traverses the AST starting from this node to locate the smallest code construct that matches the given position
	 * @param pos The 2D point to start searching for
	 * @returns The located code construct (which includes its parents)
	 */
	locate(pos: Position): CodeConstruct {
		if (this.contains(pos)) {
			for (let node of this.tokens) {
				if (node.nodeType == NodeType.Token) {
					var token = node as Token;

					if (token.contains(pos)) return token.locate(pos);
				} else {
					var expr = node as Expression;

					if (expr.contains(pos)) return expr.locate(pos);
				}
			}
		}

		return null;
	}
}

/**
 * A statement that returns a value such as: binary operators, unary operators, function calls that return a value, literal values, and variables.
 */
export abstract class Expression extends Statement implements CodeConstruct {
	nodeType = NodeType.Expression;
	// TODO: can change this to an Array to enable type checking when returning multiple items
	returns: DataType;

	constructor(returns: DataType) {
		super();

		this.returns = returns;
	}
}

/**
 * The smallest code construct: identifiers, holes (for either identifiers or expressions), operators and characters, and etc.
 */
export abstract class Token implements CodeConstruct, Node {
	nodeType = NodeType.Token;
	rootNode: Node = null;
	indexInRoot: number;

	left: number;
	right: number;

	text: string;

	constructor(text: string, root?: Node) {
		this.rootNode = root;
		this.text = text;
	}

	/**
	 * Builds the left and right positions of this token based on its text length.
	 * @param pos the left position to start building this node's right position.
	 * @returns the final right position of this node: for tokens it equals to `this.left + this.text.length - 1`
	 */
	build(pos: Position): Position {
		this.left = pos.column;
		this.right = pos.column + this.text.length - 1;

		return new Position(pos.lineNumber, this.right + 1);
	}

	/**
	 * Checks if this node contains the given position (as a 2D point)
	 * @param pos the 2D point to check
	 * @returns true: contains, false: does not contain
	 */
	contains(pos: Position): boolean {
		if (pos.column >= this.left && pos.column <= this.right) return true;

		return false;
	}

	/**
	 * For this token element, it returns it self.
	 * @param pos Not used
	 * @returns This token
	 */
	locate(pos: Position): CodeConstruct {
		return this;
	}
}

/**
 * The main body of the code which includes an array of statements.
 */
export class Module {
	body = new Array<Statement>();
	focusedNode: Node;
	focusedPos: Position;
}

export class Argument {
	type: DataType;
	name: string;
	isOptional: boolean;

	constructor(type: DataType, name: string, isOptional: boolean) {
		this.type = type;
		this.name = name;
		this.isOptional = isOptional;
	}
}

export class EmptyLineStmt extends Statement {
	constructor(root?: Node, indexInRoot?: number) {
		super();

		this.rootNode = root;
		this.indexInRoot = indexInRoot;
		this.tokens.push(new EmptySpaceTkn(this, this.tokens.length));
	}
}

export class VarAssignmentStmt extends Statement {
	private identifierIndex: number;
	private valueIndex: number;

	constructor(id?: string, root?: Node, indexInRoot?: number) {
		super();

		this.rootNode = root;
		this.indexInRoot = indexInRoot;

		this.identifierIndex = this.tokens.length;
		this.tokens.push(
			id != null ? new IdTkn(id, this, this.tokens.length) : new EmptyIdTkn(this, this.tokens.length)
		);
		this.tokens.push(new EmptySpaceTkn(this, this.tokens.length));
		this.tokens.push(new OperatorTkn('=', this, this.tokens.length));
		this.tokens.push(new EmptySpaceTkn(this, this.tokens.length));
		this.valueIndex = this.tokens.length;
		this.tokens.push(new EmptyExp(this, this.tokens.length));
	}

	replaceIdentifier(node: Node) {
		// prepare the new Node
		node.rootNode = this;
		node.indexInRoot = this.identifierIndex;

		// prepare to rebuild siblings and root (recursively)
		let rebuildColumn: number;

		if (this.tokens[this.identifierIndex].nodeType == NodeType.Token)
			rebuildColumn = (this.tokens[this.identifierIndex] as Token).left;
		else rebuildColumn = (this.tokens[this.identifierIndex] as Expression).left;

		// replace
		this.tokens[this.identifierIndex] = node;

		if (rebuildColumn) this.rebuild(new Position(this.lineNumber, rebuildColumn), this.identifierIndex);
	}

	replaceValue(node: Node) {
		// prepare the new Node
		node.rootNode = this;
		node.indexInRoot = this.valueIndex;

		// prepare to rebuild siblings and root (recursively)
		let rebuildColumn: number;

		if (this.tokens[this.valueIndex].nodeType == NodeType.Token)
			rebuildColumn = (this.tokens[this.valueIndex] as Token).left;
		else rebuildColumn = (this.tokens[this.valueIndex] as Expression).left;

		// replace
		this.tokens[this.valueIndex] = node;

		if (rebuildColumn) this.rebuild(new Position(this.lineNumber, rebuildColumn), this.valueIndex);
	}
}

export class FunctionCallStmt extends Expression {
	private argumentsIndices = new Array<number>();

	constructor(functionName: string, args: Array<Argument>, returns: DataType, root?: Node, indexInRoot?: number) {
		super(returns);

		this.rootNode = root;
		this.indexInRoot = indexInRoot;

		this.tokens.push(new FunctionNameTkn(functionName, this, this.tokens.length));
		this.tokens.push(new ParenthesisTkn('(', this, this.tokens.length));

		// TODO: handle parenthesis in a better way (to be able to highlight the other when selecting one)

		for (let i = 0; i < args.length; i++) {
			let arg = args[i];

			this.argumentsIndices.push(this.tokens.length);
			this.tokens.push(new TypedEmptyExpr(arg.type, this, this.tokens.length));

			if (i + 1 < args.length) this.tokens.push(new FunctionArgCommaTkn(this, this.tokens.length));
		}

		this.tokens.push(new ParenthesisTkn(')', this, this.tokens.length));
	}

	replaceArgument(index: number, to: Node) {
		// prepare the new Node
		to.rootNode = this;
		to.indexInRoot = this.argumentsIndices[index];

		// prepare to rebuild siblings and root (recursively)
		let rebuildColumn: number;

		if (this.tokens[this.argumentsIndices[index]].nodeType == NodeType.Token)
			rebuildColumn = (this.tokens[this.argumentsIndices[index]] as Token).left;
		else rebuildColumn = (this.tokens[this.argumentsIndices[index]] as Expression).left;

		// replace
		this.tokens[this.argumentsIndices[index]] = to;

		if (rebuildColumn) this.rebuild(new Position(this.lineNumber, rebuildColumn), this.argumentsIndices[index]);
	}
}

export class BinaryOperatorExpr extends Expression {
	operator: BinaryOperator;
	private leftOperandIndex: number;
	private rightOperandIndex: number;

	constructor(operator: BinaryOperator, returns: DataType, root?: Node, indexInRoot?: number) {
		super(returns);

		this.rootNode = root;
		this.indexInRoot = indexInRoot;
		this.operator = operator;

		this.leftOperandIndex = this.tokens.length;
		this.tokens.push(new TypedEmptyExpr(returns, this, this.tokens.length));
		this.tokens.push(new EmptySpaceTkn(this, this.tokens.length));
		this.tokens.push(new OperatorTkn(operator, this, this.tokens.length));
		this.tokens.push(new EmptySpaceTkn(this, this.tokens.length));
		this.rightOperandIndex = this.tokens.length;
		this.tokens.push(new TypedEmptyExpr(returns, this, this.tokens.length));
	}

	replaceLeftOperand(node: Node) {
		// prepare the new Node
		node.rootNode = this;
		node.indexInRoot = this.leftOperandIndex;

		// prepare to rebuild siblings and root (recursively)
		let rebuildColumn: number;

		if (this.tokens[this.leftOperandIndex].nodeType == NodeType.Token)
			rebuildColumn = (this.tokens[this.leftOperandIndex] as Token).left;
		else rebuildColumn = (this.tokens[this.leftOperandIndex] as Expression).left;

		// replace
		this.tokens[this.leftOperandIndex] = node;

		if (rebuildColumn) this.rebuild(new Position(this.lineNumber, rebuildColumn), this.leftOperandIndex);
	}

	replaceRightOperand(node: Node) {
		// prepare the new Node
		node.rootNode = this;
		node.indexInRoot = this.rightOperandIndex;

		// prepare to rebuild siblings and root (recursively)
		let rebuildColumn: number;

		if (this.tokens[this.rightOperandIndex].nodeType == NodeType.Token)
			rebuildColumn = (this.tokens[this.rightOperandIndex] as Token).left;
		else rebuildColumn = (this.tokens[this.rightOperandIndex] as Expression).left;

		// replace
		this.tokens[this.rightOperandIndex] = node;

		// rebuild
		if (rebuildColumn) this.rebuild(new Position(this.lineNumber, rebuildColumn), this.rightOperandIndex);
	}
}

export class LiteralValExpr extends Expression {
	value: string; // it holds the string information of the value (could be a number, float, or a string with quotes)

	constructor(value: string, returns: DataType, root?: Node, indexInRoot?: number) {
		super(returns);

		this.rootNode = root;
		this.indexInRoot = indexInRoot;
		this.value = value;
	}

	build(pos: Position): Position {
		this.lineNumber = pos.lineNumber;
		this.left = pos.column;
		this.right = pos.column + this.value.length - 1;

		return new Position(pos.lineNumber, this.right + 1);
	}

	locate(pos: Position) {
		return this;
	}
}

export class FunctionNameTkn extends Token {
	constructor(functionName: string, root?: Node, indexInRoot?: number) {
		super(functionName);

		this.rootNode = root;
		this.indexInRoot = indexInRoot;
	}
}

export class TypedEmptyExpr extends Token {
	type: DataType;

	constructor(type: DataType, root?: Node, indexInRoot?: number) {
		super('---');

		this.rootNode = root;
		this.indexInRoot = indexInRoot;
		this.type = type;
	}
}

export class EmptyExp extends Token {
	constructor(root?: Node, indexInRoot?: number) {
		super('---');

		this.rootNode = root;
		this.indexInRoot = indexInRoot;
	}
}

export class IdTkn extends Token {
	constructor(name: string, root?: Node, indexInRoot?: number) {
		super(name);

		this.rootNode = root;
		this.indexInRoot = indexInRoot;
	}
}

export class EmptyIdTkn extends Token {
	constructor(root?: Node, indexInRoot?: number) {
		super('---');

		this.rootNode = root;
		this.indexInRoot = indexInRoot;
	}
}

export class EmptySpaceTkn extends Token {
	constructor(root?: Node, indexInRoot?: number) {
		super(' ');

		this.rootNode = root;
		this.indexInRoot = indexInRoot;
	}
}

export class OperatorTkn extends Token {
	operator: string = '';

	constructor(text: string, root?: Node, indexInRoot?: number) {
		super(text);

		this.rootNode = root;
		this.indexInRoot = indexInRoot;
		this.operator = text;
	}
}

export class ParenthesisTkn extends Token {
	constructor(text: string, root?: Node, indexInRoot?: number) {
		super(text);

		this.rootNode = root;
		this.indexInRoot = indexInRoot;
	}
}

export class FunctionArgCommaTkn extends Token {
	constructor(root?: Node, indexInRoot?: number) {
		super(', ');

		this.rootNode = root;
		this.indexInRoot = indexInRoot;
	}
}

export function test() {
	// TODO: write this in a TDD way
	var varAssignStmt = new VarAssignmentStmt('variable');
	varAssignStmt.build(new Position(1, 1));

	var sumExpr = new BinaryOperatorExpr(BinaryOperator.Add, DataType.Number);
	sumExpr.replaceRightOperand(new LiteralValExpr('1000', DataType.Number));
	var randFunCall = new FunctionCallStmt(
		'randint',
		[ new Argument(DataType.Number, 'start', false), new Argument(DataType.Number, 'stop', false) ],
		DataType.Number
	);

	var subExpr = new BinaryOperatorExpr(BinaryOperator.Subtract, DataType.Number);
	subExpr.replaceLeftOperand(new LiteralValExpr('10000', DataType.Number));
	subExpr.replaceRightOperand(new LiteralValExpr('500', DataType.Number));

	randFunCall.replaceArgument(1, new LiteralValExpr('0', DataType.Number));
	randFunCall.replaceArgument(0, subExpr);

	sumExpr.replaceLeftOperand(randFunCall);

	varAssignStmt.replaceValue(sumExpr);
	varAssignStmt.build(new Position(1, 1));
	// variable = randint(10000 - 500, 99) + 1000
	subExpr.replaceRightOperand(new LiteralValExpr('1', DataType.Number));
	subExpr.replaceRightOperand(new LiteralValExpr('5', DataType.Number));
	randFunCall.replaceArgument(0, new LiteralValExpr('10', DataType.Number));
	randFunCall.replaceArgument(0, new LiteralValExpr('25', DataType.Number));

	varAssignStmt.replaceIdentifier(new IdTkn('vvarr'));
	varAssignStmt.replaceIdentifier(new IdTkn('vv123'));
}
