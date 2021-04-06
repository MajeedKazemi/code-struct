import * as monaco from 'monaco-editor';
import Cursor from '../editor/cursor';
import Editor from '../editor/editor';
import { EventHandler } from '../editor/events';

export enum EditFunctions {
	InsertStatement,
	InsertStatementBefore,
	InsertStatementAfter,
	RemoveStatement,
	SetExpression,
	SetLiteral,
	ChangeLiteral,
	RemoveExpression,
	ChangeIdentifier
}

export enum DataType {
	Number,
	Boolean,
	String,
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
	Statement,
	Module
}

export enum CodeClass {
	EmptyLineStatement,
	VarAssignStatement,
	FunctionCallStatement,
	BinaryOperatorExpression,
	LiteralValueExpression,
	EmptyExpression,
	IdentifierToken,
	EditableTextToken,
	NextLineToken,
	PrevLineToken,
	OperatorToken
}

export enum AddableType {
	NotAddable,

	Statement,
	Expression,
	Identifier,
	NumberLiteral,
	StringLiteral
}

export interface CodeConstruct {
	/** 
	 * Indicates whether this code-construct implements the TextEditable interface or not.
	 */
	isTextEditable: boolean;

	/**
	 * Indicates the class-type of this code-construct.
	 */
	codeClass: CodeClass;

	/**
	 * Indicates if the code-construct is either a `Statement`, `Expression`, `Token`, or the `Module`
	 */
	nodeType: NodeType;

	/**
	 * The parent/root node for this code-construct. Statements are the only code construct that could have the Module as their root node.
	 */
	rootNode: CodeConstruct | Module;

	/**
	 * The index this item has inside its root's body (if root is the Module), or its tokens array.
	 */
	indexInRoot: number;

	/**
	 * Different types of valid edits (as a list) that could be received for a selected/focused Statement, Expression, or Token.
	 */
	validEdits: Array<EditFunctions>;

	/**
	 * Different types of edits when adding this statement/expression/token.
	 */
	receives: Array<AddableType>;

	/**
	 * The left column position of this code-construct.
	 */
	left: number;

	/**
	 * The right column position of this code-construct.
	 */
	right: number;

	/**
	 * Determines if this code-construct could be added (either from the toolbox or the autocomplete or elsewhere) to the program, and the type it accepts.
	 */
	addableType: AddableType;

	/**
	 * Builds the left and right positions of this node and all of its children nodes recursively.
	 * @param pos the left position to start building the nodes from
	 * @returns the final right position of the whole node (calculated after building all of the children nodes)
	 */
	build(pos: monaco.Position): monaco.Position;

	/**
	 * Traverses the AST starting from this node to locate the smallest code construct that matches the given position
	 * @param pos The 2D point to start searching for
	 * @returns The located code construct (which includes its parents)
	 */
	locate(pos: monaco.Position): CodeConstruct;

	/**
	 * Checks if this node contains the given position (as a 2D point)
	 * @param pos the 2D point to check
	 * @returns true: contains, false: does not contain
	 */
	contains(pos: monaco.Position): boolean;

	/**
	 * Finds and returns the next empty hole (name or value) in this code construct
	 * @returns The found empty token or null (if nothing it didn't include any empty tokens)
	 */
	nextEmptyToken(): CodeConstruct;

	/**
	 * Returns the textual value of the code construct (joining internal tokens for expressions and statements)
	 */
	getRenderText(): string;

	/**
	 * Returns the line number of this code-construct in the rendered text.
	 */
	getLineNumber(): number;

	/**
	 * Returns the left-position `(lineNumber, column)` of this code-construct in the rendered text.
	 */
	getLeftPosition(): monaco.Position;

	/**
	 * Returns a `Selection` object for this particular code-construct when it is selected
	 */
	getSelection(): monaco.Selection;

	/**
	 * Finds and returns the next editable code-construct to the right of this code-construct.
	 */
	getNextEditableToken(fromIndex?: number): CodeConstruct;

	/**
	 * Finds and returns the next editable code-construct to the left of this code-construct.
	 */
	getPrevEditableToken(fromIndex?: number): CodeConstruct;

	/**
	 * Returns the parent statement of this code-construct (an element of the Module.body array).
	 */
	getParentStatement(): Statement;
}

/**
 * A complete code statement such as: variable assignment, function call, conditional, loop, function definition, and other statements.
 */
export abstract class Statement implements CodeConstruct {
	isTextEditable = false;
	codeClass: CodeClass;

	addableType: AddableType;
	nodeType = NodeType.Statement;
	rootNode: CodeConstruct | Module = null;
	indexInRoot: number;

	validEdits = new Array<EditFunctions>();
	receives = new Array<AddableType>();

	// TODO: might want to change this to first, and last nodes? or a function that calculates left and right based on those two
	lineNumber: number;
	left: number;
	right: number;

	tokens = new Array<CodeConstruct>();

	hasEmptyToken: boolean;

	build(pos: monaco.Position): monaco.Position {
		this.lineNumber = pos.lineNumber;
		this.left = pos.column;
		var curPos = pos;

		for (let i = 0; i < this.tokens.length; i++) {
			let code = this.tokens[i];

			if (code.nodeType == NodeType.Token) curPos = (code as Token).build(curPos);
			else curPos = (code as Expression).build(curPos);
		}

		this.right = curPos.column - 1;

		return curPos;
	}

	/**
	 * Rebuilds the left and right positions of this node recursively. Optimized to not rebuild untouched nodes.
	 * @param pos the left position to start building the nodes from
	 * @param fromIndex the index of the node that was edited.
	 */
	rebuild(pos: monaco.Position, fromIndex: number) {
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
			if (this.rootNode != undefined && this.indexInRoot != undefined) {
				if (this.rootNode.nodeType == NodeType.Expression) {
					(this.rootNode as Expression).rebuild(curPos, this.indexInRoot + 1);
				} else if (this.rootNode.nodeType == NodeType.Statement) {
					(this.rootNode as Statement).rebuild(curPos, this.indexInRoot + 1);
				}
			} else console.warn('Node did not have rootNode or indexInRoot: ', this.tokens);
		}
	}

	contains(pos: monaco.Position): boolean {
		if (pos.lineNumber != this.lineNumber) return false;

		if (pos.column >= this.left && pos.column <= this.right) return true;

		return false;
	}

	locate(pos: monaco.Position): CodeConstruct {
		if (pos.lineNumber == this.lineNumber) {
			if (pos.column == this.left) return this.tokens[0];
			else if (pos.column == this.right + 1) return this.tokens[this.tokens.length - 1];
		}

		if (this.contains(pos)) {
			for (let code of this.tokens) {
				if (code.nodeType == NodeType.Token) {
					var token = code as Token;

					if (token.contains(pos)) return token.locate(pos);
				} else {
					var expr = code as Expression;

					if (expr.contains(pos)) return expr.locate(pos);
				}
			}
		}

		return null;
	}

	nextEmptyToken(): CodeConstruct {
		// TODO: should simply return next-token if nothing was found.

		for (let code of this.tokens) {
			if (code.nodeType == NodeType.Token) {
				let token = code as Token;

				if (token.isEmpty) {
					return token;
				}
			} else {
				let expr = code as Expression;

				if (expr.hasEmptyToken) return expr.nextEmptyToken();

				return null;
			}
		}

		for (let code of this.tokens) {
			if (code.nodeType == NodeType.Token) {
				let token = code as Token;

				if (token.validEdits.length > 0) {
					return token;
				}
			} else {
				let expr = code as Expression;

				if (expr.validEdits.length > 0) return expr.nextEmptyToken();

				return null;
			}
		}
	}

	/**
	 * This function should be called after replacing a token within this statement. it checks if the newly added token `isEmpty` or not, and if yes, it will set `hasEmptyToken = true`
	 * @param code the newly added node within the replace function
	 */
	updateHasEmptyToken(code: CodeConstruct) {
		if (code.nodeType == NodeType.Token) {
			let token = code as Token;

			if (token.isEmpty) this.hasEmptyToken = true;
			else this.hasEmptyToken = false;
		}
	}

	/**
	 * Replaces this node in its root, and then rebuilds the parent (recursively)
	 * @param code the new code-construct to replace
	 * @param index the index to replace at
	 */
	replace(code: CodeConstruct, index: number) {
		// prepare the new Node
		code.rootNode = this;
		code.indexInRoot = index;

		// prepare to rebuild siblings and root (recursively)
		let rebuildColumn: number;

		if (this.tokens[index].nodeType == NodeType.Token) rebuildColumn = (this.tokens[index] as Token).left;
		else rebuildColumn = (this.tokens[index] as Expression).left;

		// replace
		this.tokens[index] = code;

		if (rebuildColumn) this.rebuild(new monaco.Position(this.lineNumber, rebuildColumn), index);

		this.updateHasEmptyToken(code);
	}

	getRenderText(): string {
		let txt: string = '';

		for (let token of this.tokens) txt += token.getRenderText();

		return txt;
	}

	getLineNumber(): number {
		return this.lineNumber;
	}

	getLeftPosition(): monaco.Position {
		return new monaco.Position(this.getLineNumber(), this.left);
	}

	getSelection(): monaco.Selection {
		return new monaco.Selection(this.lineNumber, this.right + 1, this.lineNumber, this.left);
	}

	getNextEditableToken(fromIndex?: number): CodeConstruct {
		let startIndex = fromIndex != undefined ? fromIndex : 0;

		for (let i = startIndex; i < this.tokens.length; i++) {
			if (this.tokens[i].validEdits.length > 0) {
				if (this.tokens[i].nodeType == NodeType.Token) return this.tokens[i];

				return this.tokens[i].getNextEditableToken();
			}
		}

		console.error('getNextEditableToken() found nothing');
	}

	getPrevEditableToken(fromIndex?: number): CodeConstruct {
		let startIndex = fromIndex != undefined ? fromIndex : this.tokens.length - 1;

		for (let i = startIndex; i >= 0; i--) {
			if (this.tokens[i].validEdits.length > 0) {
				if (this.tokens[i].nodeType == NodeType.Token) return this.tokens[i];

				return this.tokens[i].getPrevEditableToken();
			}
		}

		console.error('getPrevEditableToken() found nothing');
	}

	getParentStatement(): Statement {
		return this;
	}
}

/**
 * A statement that returns a value such as: binary operators, unary operators, function calls that return a value, literal values, and variables.
 */
export abstract class Expression extends Statement implements CodeConstruct {
	isTextEditable = false;
	codeClass: CodeClass;
	addableType: AddableType;
	nodeType = NodeType.Expression;
	// TODO: can change this to an Array to enable type checking when returning multiple items
	returns: DataType;

	constructor(returns: DataType) {
		super();

		this.returns = returns;
	}

	isStatement(): boolean {
		return this.returns == DataType.Void;
	}

	getLineNumber(): number {
		if (this.isStatement()) return this.lineNumber;
		else if (this.rootNode.nodeType == NodeType.Statement) return (this.rootNode as Statement).getLineNumber();
		else return (this.rootNode as Expression).getLineNumber();
	}

	getSelection(): monaco.Selection {
		let line = this.getLineNumber();

		return new monaco.Selection(line, this.right + 1, line, this.left);
	}

	getNextEditableToken(fromIndex?: number): CodeConstruct {
		let startIndex = fromIndex != undefined ? fromIndex : 0;

		for (let i = startIndex; i < this.tokens.length; i++) {
			if (this.tokens[i].validEdits.length > 0) {
				if (this.tokens[i].nodeType == NodeType.Token) return this.tokens[i];

				return this.tokens[i].getNextEditableToken(0);
			}
		}

		if (this.rootNode.nodeType == NodeType.Expression)
			return (this.rootNode as Expression).getNextEditableToken(this.indexInRoot + 1);
		else if (this.rootNode.nodeType == NodeType.Statement)
			return (this.rootNode as Statement).getNextEditableToken(this.indexInRoot + 1);

		console.error('getNextEditableToken() found nothing');
	}

	getPrevEditableToken(fromIndex?: number): CodeConstruct {
		let startIndex = fromIndex != undefined ? fromIndex : this.tokens.length - 1;

		for (let i = startIndex; i >= 0; i--) {
			if (this.tokens[i].validEdits.length > 0) {
				if (this.tokens[i].nodeType == NodeType.Token) return this.tokens[i];

				return this.tokens[i].getPrevEditableToken();
			}
		}

		if (this.rootNode.nodeType == NodeType.Expression)
			return (this.rootNode as Expression).getPrevEditableToken(this.indexInRoot - 1);
		else if (this.rootNode.nodeType == NodeType.Statement)
			return (this.rootNode as Statement).getPrevEditableToken(this.indexInRoot - 1);

		console.error('getPrevEditableToken() found nothing');
	}

	getParentStatement(): Statement {
		if (this.rootNode.nodeType == NodeType.Statement) return this.rootNode as Statement;
		else if (this.rootNode.nodeType == NodeType.Expression)
			return (this.rootNode as Expression).getParentStatement();
	}
}

/**
 * The smallest code construct: identifiers, holes (for either identifiers or expressions), operators and characters, and etc.
 */
export abstract class Token implements CodeConstruct {
	isTextEditable = false;
	codeClass: CodeClass;
	addableType: AddableType;
	nodeType = NodeType.Token;
	rootNode: CodeConstruct = null;
	indexInRoot: number;

	validEdits = new Array<EditFunctions>();
	receives = new Array<AddableType>();

	left: number;
	right: number;

	text: string;
	isEmpty: boolean = false;

	constructor(text: string, root?: CodeConstruct) {
		this.rootNode = root;
		this.text = text;
	}

	/**
	 * Builds the left and right positions of this token based on its text length.
	 * @param pos the left position to start building this node's right position.
	 * @returns the final right position of this node: for tokens it equals to `this.left + this.text.length - 1`
	 */
	build(pos: monaco.Position): monaco.Position {
		this.left = pos.column;
		this.right = pos.column + this.text.length - 1;

		return new monaco.Position(pos.lineNumber, this.right + 1);

		// this.right = this.left + this.text.length - (this.text.length > 1 ? 1 : 0);

		// return new monaco.Position(pos.lineNumber, this.right + (this.text.length > 0 ? 1 : 0));
	}

	/**
	 * Checks if this node contains the given position (as a 2D point)
	 * @param pos the 2D point to check
	 * @returns true: contains, false: does not contain
	 */
	contains(pos: monaco.Position): boolean {
		if (pos.column >= this.left && pos.column <= this.right) return true;

		return false;
	}

	/**
	 * For this token element, it returns it self.
	 * @param pos Not used
	 * @returns This token
	 */
	locate(pos: monaco.Position): CodeConstruct {
		return this;
	}

	/**
	 * Finds and returns the next empty hole (name or value) in this code construct
	 * @returns The found empty token or null (if nothing it didn't include any empty tokens)
	 */
	nextEmptyToken(): CodeConstruct {
		if (this.isEmpty) return this;

		return null;
	}

	getRenderText(): string {
		return this.text;
	}

	getLineNumber(): number {
		if (this.rootNode.nodeType == NodeType.Statement) return (this.rootNode as Statement).getLineNumber();
		else return (this.rootNode as Expression).getLineNumber();
	}

	getLeftPosition(): monaco.Position {
		return new monaco.Position(this.getLineNumber(), this.left);
	}

	getSelection(): monaco.Selection {
		let line = this.getLineNumber();
		let step = this.text.length == 0 ? 0 : 1;

		return new monaco.Selection(line, this.right + step, line, this.left);
	}

	getNextEditableToken(fromIndex?: number): CodeConstruct {
		return this.rootNode.getNextEditableToken(this.indexInRoot + 1);
	}

	getPrevEditableToken(): CodeConstruct {
		return this.rootNode.getPrevEditableToken(this.indexInRoot - 1);
	}

	getParentStatement(): Statement {
		if (this.rootNode.nodeType == NodeType.Statement) return this.rootNode as Statement;
		else if (this.rootNode.nodeType == NodeType.Expression) return this.rootNode.getParentStatement();
	}
}

/**
 * Anything that implements these, can be edited with the keyboard
 */
export interface TextEditable {
	/**
	 * The Regex used for validating this code-construct.
	 */
	validatorRegex: RegExp;

	/**
	 * Returns the editable portion of the element's text that could be edited later.
	 */
	getEditableText(): string;

	/**
	 * checks if the newly updated string could be set (using a Regex) and rebuilds the item if possible and returns `true`, o.w. returns `false`.
	 * @param text the updated string to be set to this element.
	 */
	setEditedText(text: string): boolean;
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
	codeClass = CodeClass.EmptyLineStatement;
	addableType = AddableType.Statement;
	hasEmptyToken = false;

	constructor(root?: CodeConstruct | Module, indexInRoot?: number) {
		super();

		this.validEdits.push(EditFunctions.InsertStatement, EditFunctions.RemoveStatement);
		this.receives.push(AddableType.Statement);

		this.rootNode = root;
		this.indexInRoot = indexInRoot;
	}

	build(pos: monaco.Position): monaco.Position {
		this.lineNumber = pos.lineNumber;
		this.left = this.right = pos.column;

		return new monaco.Position(this.lineNumber, this.right + 1);
	}

	nextEmptyToken(): CodeConstruct {
		return this;
	}

	getRenderText(): string {
		return '';
	}

	locate(pos: monaco.Position): CodeConstruct {
		return this;
	}
}

export class VarAssignmentStmt extends Statement {
	codeClass = CodeClass.VarAssignStatement;
	addableType = AddableType.Statement;
	private identifierIndex: number;
	private valueIndex: number;

	constructor(id?: string, root?: CodeConstruct | Module, indexInRoot?: number) {
		super();

		this.rootNode = root;
		this.indexInRoot = indexInRoot;

		this.validEdits.push(EditFunctions.RemoveStatement);

		this.identifierIndex = this.tokens.length;
		this.tokens.push(new PrevLineTkn(this, this.tokens.length));
		this.tokens.push(new IdentifierTkn(id, this, this.tokens.length));
		this.tokens.push(new PunctuationTkn(' ', this, this.tokens.length));
		this.tokens.push(new OperatorTkn('=', this, this.tokens.length));
		this.tokens.push(new PunctuationTkn(' ', this, this.tokens.length));
		this.valueIndex = this.tokens.length;
		this.tokens.push(new EmptyExpr(this, this.tokens.length));
		this.tokens.push(new NextLineTkn(this, this.tokens.length));

		this.hasEmptyToken = true;
	}

	replaceIdentifier(code: CodeConstruct) {
		this.replace(code, this.identifierIndex);
	}

	replaceValue(code: CodeConstruct) {
		this.replace(code, this.valueIndex);
	}
}

export class FunctionCallStmt extends Expression {
	codeClass = CodeClass.FunctionCallStatement;
	/**
	 * function calls such as `print()` are single-line statements, while `randint()` are expressions and could be used inside a more complex expression, this should be specified when instantiating the `FunctionCallStmt` class.
	 */
	private argumentsIndices = new Array<number>();
	addableType: AddableType;

	constructor(
		functionName: string,
		args: Array<Argument>,
		returns: DataType,
		root?: CodeConstruct | Module,
		indexInRoot?: number
	) {
		super(returns);

		this.rootNode = root;
		this.indexInRoot = indexInRoot;

		if (this.isStatement()) {
			this.validEdits.push(EditFunctions.RemoveStatement);
			this.addableType = AddableType.Statement;
		} else {
			this.validEdits.push(EditFunctions.RemoveExpression);
			this.addableType = AddableType.Expression;
		}

		if (this.isStatement()) this.tokens.push(new PrevLineTkn(this, this.tokens.length));
		this.tokens.push(new FunctionNameTkn(functionName, this, this.tokens.length));
		this.tokens.push(new PunctuationTkn('(', this, this.tokens.length));

		// TODO: handle parenthesis in a better way (to be able to highlight the other when selecting one)

		for (let i = 0; i < args.length; i++) {
			let arg = args[i];

			this.argumentsIndices.push(this.tokens.length);
			this.tokens.push(new TypedEmptyExpr(arg.type, this, this.tokens.length));

			if (i + 1 < args.length) this.tokens.push(new PunctuationTkn(', ', this, this.tokens.length));
		}

		this.tokens.push(new PunctuationTkn(')', this, this.tokens.length));
		if (this.isStatement()) this.tokens.push(new NextLineTkn(this, this.tokens.length));

		this.hasEmptyToken = true;
	}

	replaceArgument(index: number, to: CodeConstruct) {
		this.replace(to, this.argumentsIndices[index]);
	}
}

export class BinaryOperatorExpr extends Expression {
	codeClass = CodeClass.BinaryOperatorExpression;
	addableType = AddableType.Expression;
	operator: BinaryOperator;
	private leftOperandIndex: number;
	private rightOperandIndex: number;

	constructor(operator: BinaryOperator, returns: DataType, root?: CodeConstruct, indexInRoot?: number) {
		super(returns);

		this.rootNode = root;
		this.indexInRoot = indexInRoot;
		this.operator = operator;

		this.addableType = AddableType.Expression;
		this.validEdits.push(EditFunctions.RemoveExpression);

		this.leftOperandIndex = this.tokens.length;
		this.tokens.push(new PunctuationTkn('(', this, this.tokens.length));
		this.tokens.push(new EmptyExpr(this, this.tokens.length));
		this.tokens.push(new PunctuationTkn(' ', this, this.tokens.length));
		this.tokens.push(new OperatorTkn(operator, this, this.tokens.length));
		this.tokens.push(new PunctuationTkn(' ', this, this.tokens.length));
		this.rightOperandIndex = this.tokens.length;
		this.tokens.push(new EmptyExpr(this, this.tokens.length));
		this.tokens.push(new PunctuationTkn(')', this, this.tokens.length));

		this.hasEmptyToken = true;
	}

	replaceLeftOperand(code: CodeConstruct) {
		this.replace(code, this.leftOperandIndex);
	}

	replaceRightOperand(code: CodeConstruct) {
		this.replace(code, this.rightOperandIndex);
	}
}

export class EditableTextTkn extends Token implements TextEditable {
	codeClass = CodeClass.EditableTextToken;
	isTextEditable = true;
	validatorRegex: RegExp;

	constructor(text: string, regex: RegExp, root?: CodeConstruct, indexInRoot?: number) {
		super(text);

		this.rootNode = root;
		this.indexInRoot = indexInRoot;
		this.validatorRegex = regex;

		this.validEdits.push(EditFunctions.ChangeIdentifier);
	}

	getEditableText(): string {
		return this.text;
	}

	setEditedText(text: string): boolean {
		if (this.validatorRegex.test(text)) {
			this.text = text;
			(this.rootNode as Expression).rebuild(this.getLeftPosition(), this.indexInRoot);

			return true;
		} else return false;
	}

	build(pos: monaco.Position): monaco.Position {
		this.left = pos.column;

		if (this.text.length == 0) this.right = pos.column + this.text.length;
		else this.right = pos.column + this.text.length - 1;

		return new monaco.Position(pos.lineNumber, this.right + 1);
	}
}

export class LiteralValExpr extends Expression {
	codeClass = CodeClass.LiteralValueExpression;
	addableType = AddableType.Expression;

	constructor(value: string, returns: DataType, root?: CodeConstruct, indexInRoot?: number) {
		super(returns);

		switch (returns) {
			case DataType.String: {
				this.tokens.push(new PunctuationTkn('"', this, this.tokens.length));
				this.tokens.push(new EditableTextTkn('', RegExp('^([^\\r\\n\\"]*)$'), this, this.tokens.length));
				this.tokens.push(new PunctuationTkn('"', this, this.tokens.length));

				break;
			}

			case DataType.Number: {
				this.tokens.push(
					new EditableTextTkn('', RegExp('^(([0-9]*)|(([0-9]*)\\.([0-9]*)))$'), this, this.tokens.length)
				);

				break;
			}

			case DataType.Boolean: {
				this.tokens.push(new NonEditableTextTkn(value, this, this.tokens.length));

				break;
			}
		}

		this.rootNode = root;
		this.indexInRoot = indexInRoot;

		this.validEdits.push(EditFunctions.ChangeLiteral);
	}
}

export class IdentifierTkn extends Token implements TextEditable {
	isTextEditable = true;
	codeClass = CodeClass.IdentifierToken;
	addableType = AddableType.Identifier;
	validatorRegex: RegExp;

	constructor(identifier?: string, root?: CodeConstruct, indexInRoot?: number) {
		super(identifier == undefined ? '---' : identifier);

		if (identifier == undefined) {
			this.isEmpty = true;
		} else {
			this.isEmpty = false;
		}

		this.rootNode = root;
		this.indexInRoot = indexInRoot;
		this.validatorRegex = RegExp('^[^\\d\\W]\\w*$');

		this.validEdits.push(EditFunctions.ChangeIdentifier);
	}

	getEditableText(): string {
		return this.text;
	}

	setEditedText(text: string): boolean {
		if (this.validatorRegex.test(text)) {
			this.text = text;
			(this.rootNode as Statement).rebuild(this.getLeftPosition(), this.indexInRoot);

			return true;
		} else return false;
	}
}

export class NonEditableTextTkn extends Token {
	isEmpty = false;

	constructor(value: string, root?: CodeConstruct, indexInRoot?: number) {
		super(value);

		this.rootNode = root;
		this.indexInRoot = indexInRoot;
	}
}

export class FunctionNameTkn extends Token {
	isEmpty = false;

	constructor(functionName: string, root?: CodeConstruct, indexInRoot?: number) {
		super(functionName);

		this.rootNode = root;
		this.indexInRoot = indexInRoot;
	}

	locate(pos: monaco.Position): CodeConstruct {
		return this.rootNode;
	}

	getSelection(): monaco.Selection {
		return this.rootNode.getSelection();
	}
}

export class TypedEmptyExpr extends Token {
	isEmpty = true;
	type: DataType;

	constructor(type: DataType, root?: CodeConstruct, indexInRoot?: number) {
		super('---');

		this.rootNode = root;
		this.indexInRoot = indexInRoot;
		this.type = type;

		this.validEdits.push(EditFunctions.SetExpression);
		this.receives.push(AddableType.Expression);
	}
}

export class EmptyExpr extends Token {
	codeClass = CodeClass.EmptyExpression;
	isEmpty = true;

	constructor(root?: CodeConstruct, indexInRoot?: number) {
		super('---');

		this.rootNode = root;
		this.indexInRoot = indexInRoot;

		this.validEdits.push(EditFunctions.SetExpression);
		this.receives.push(AddableType.Expression);
		
	}
}

export class NextLineTkn extends Token {
	codeClass = CodeClass.NextLineToken;
	isEmpty = false;

	constructor(root?: CodeConstruct, indexInRoot?: number) {
		super('');

		this.rootNode = root;
		this.indexInRoot = indexInRoot;

		this.validEdits.push(EditFunctions.InsertStatementAfter);
		this.receives.push(AddableType.Statement);
	}
}

export class PrevLineTkn extends Token {
	codeClass = CodeClass.PrevLineToken;
	isEmpty = false;

	constructor(root?: CodeConstruct, indexInRoot?: number) {
		super('');

		this.rootNode = root;
		this.indexInRoot = indexInRoot;

		this.validEdits.push(EditFunctions.InsertStatementBefore);
		this.receives.push(AddableType.Statement);
	}
}

export class OperatorTkn extends Token {
	codeClass = CodeClass.OperatorToken;
	operator: string = '';

	constructor(text: string, root?: CodeConstruct, indexInRoot?: number) {
		super(text);

		this.rootNode = root;
		this.indexInRoot = indexInRoot;
		this.operator = text;
	}

	locate(pos: monaco.Position): CodeConstruct {
		return this.rootNode;
	}

	getSelection(): monaco.Selection {
		return this.rootNode.getSelection();
	}
}

export class PunctuationTkn extends Token {
	constructor(text: string, root?: CodeConstruct, indexInRoot?: number) {
		super(text);

		this.rootNode = root;
		this.indexInRoot = indexInRoot;
	}

	locate(pos: monaco.Position): CodeConstruct {
		return this.rootNode;
	}

	getSelection(): monaco.Selection {
		return this.rootNode.getSelection();
	}
}

/**
 * The main body of the code which includes an array of statements.
 */
export class Module {
	nodeType = NodeType.Module;

	body = new Array<Statement>();
	focusedNode: CodeConstruct;

	editor: Editor;
	eventHandler: EventHandler;
	cursor: Cursor;

	constructor(editorId: string) {
		// Editor
		this.editor = new Editor(document.getElementById(editorId));

		// AST
		this.body.push(new EmptyLineStmt(this, 0));
		this.focusedNode = this.body[0];
		this.focusedNode.build(new monaco.Position(1, 1));

		this.editor.monaco.focus();

		this.eventHandler = new EventHandler(this);
	}

	focusSelection(selection: monaco.Selection) {
		this.editor.focusSelection(selection)
	}

	insert(code: CodeConstruct) {
		if (code.addableType != AddableType.NotAddable && this.focusedNode.receives.indexOf(code.addableType) > -1) {
			if (this.focusedNode.receives.indexOf(AddableType.Statement) > -1) {
				let statement = code as Statement;
				this.body[this.focusedNode.indexInRoot] = statement;

				statement.rootNode = this.focusedNode.rootNode;
				statement.indexInRoot = this.focusedNode.indexInRoot;

				let focusedPos = this.focusedNode.getLeftPosition();
				statement.build(focusedPos);

				let range = new monaco.Range(
					focusedPos.lineNumber,
					statement.left,
					focusedPos.lineNumber,
					statement.right
				);

				this.editor.executeEdits(range, statement);
			} else if (this.focusedNode.receives.indexOf(AddableType.Expression) > -1) {
				// replaces expression with the newly inserted expression
				let focusedPos = this.focusedNode.getLeftPosition();

				let range = new monaco.Range(
					focusedPos.lineNumber,
					this.focusedNode.left,
					focusedPos.lineNumber,
					this.focusedNode.right + 1
				);

				let root = this.focusedNode.rootNode as Statement;
				let expression = code as Expression;

				root.replace(expression, this.focusedNode.indexInRoot);
				expression.rootNode = this.focusedNode.rootNode;
				expression.indexInRoot = this.focusedNode.indexInRoot;

				let item = root.tokens[this.focusedNode.indexInRoot];

				this.focusedNode.rootNode = null;

				this.editor.executeEdits(range, item);
			}

			this.focusedNode = code.nextEmptyToken();
			this.focusSelection(this.focusedNode.getSelection());
			this.editor.monaco.focus();
		} else console.warn('Cannot insert this code construct at focused location.');
	}
}
