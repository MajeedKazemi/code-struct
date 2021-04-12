import * as monaco from 'monaco-editor';
import { EventHandler } from '../editor/events';
import { TAB_SPACES } from './keywords';

export enum EditFunctions {
	InsertStatement,
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

export enum BoolOperator {
	And = 'and',
	Or = 'or'
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
	WhileStatement,
	ForStatement,
	IfStatement,
	FunctionCallStatement,
	BinaryOperatorExpression,
	BinaryBoolExpression,
	UnaryExpression,
	ComparatorExpression,
	LiteralValueExpression,
	EmptyExpression,
	IdentifierToken,
	EditableTextToken,
	EndOfLineToken,
	StartOfLineToken,
	OperatorToken,
	VariableReferenceExpr
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
	 * The boundary of a code-construct.
	 */
	boundary: Boundary;

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

	lineNumber: number;
	left: number;
	right: number;
	boundary: Boundary;

	/**
	 * The boundary containing the body of a code-construct.
	 */
	bodyBoundary: Boundary;

	body = new Array<Statement>(); // will only initialize it inside multi-line statements that have bodies
	scope: Scope = null;
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

		this.boundary = new Boundary(this.lineNumber, this.lineNumber, this.left, this.right);

		if (this.body.length > 0) {
			// build body:
			this.bodyBoundary = new Boundary(this.lineNumber + 1, 0, this.left + TAB_SPACES, 0);

			for (let i = 0; i < this.body.length; i++) {
				this.body[i].build(new monaco.Position(pos.lineNumber + (i + 1), pos.column + TAB_SPACES));

				if (this.body[i].right > this.bodyBoundary.right) this.bodyBoundary.right = this.body[i].right;
			}

			this.bodyBoundary.bottomLine = this.body[this.body.length - 1].lineNumber;
		}

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
			} else console.warn('node did not have rootNode or indexInRoot: ', this.tokens);
		}

		this.boundary = new Boundary(this.lineNumber, this.lineNumber, this.left, this.right);

		// TODO: rebuild body

		if (this.rootNode instanceof Statement && this.rootNode.body.length > 0) {
			// inside a body => update its bodyBoundary as well.

			if (this.rootNode.bodyBoundary.right < this.right) this.rootNode.bodyBoundary.right = this.right;
		}
	}

	contains(pos: monaco.Position): boolean {
		return this.boundary.contains(pos);
	}

	getContainingStatement(pos: monaco.Position): Statement {
		if (this.contains(pos)) {
			return this;
		} else if (this.containsInBody(pos)) {
			for (let line of this.body) {
				if (line.contains(pos)) return line;
				else if (line.containsInBody(pos)) return line.getContainingStatement(pos);
			}
		}
	}

	containsInBody(pos: monaco.Position): boolean {
		if (this.body.length > 0) return this.bodyBoundary.contains(pos);
		else return false;
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

		// search into body
		if (this.containsInBody(pos))
			for (let stmt of this.body) {
				if (stmt.contains(pos)) return stmt.locate(pos);
			}

		return null;
	}

	nextEmptyToken(): CodeConstruct {
		for (let tk of this.tokens) {
			if (tk.nodeType == NodeType.Token) {
				let token = tk as Token;

				if (token.isEmpty) {
					return token;
				}
			} else {
				let expr = tk as Expression;

				if (expr.hasEmptyToken) return expr.nextEmptyToken();

				return null;
			}
		}

		// next editable code-construct
		for (let tk of this.tokens) {
			if (tk.nodeType == NodeType.Token) {
				let token = tk as Token;

				if (token.validEdits.length > 0) {
					return token;
				}
			} else {
				let expr = tk as Expression;

				if (expr.validEdits.length > 0) return expr.nextEmptyToken();

				return null;
			}
		}

		// TODO: return next selectable code-construct
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

	/**
	 * Replaced the given item with the item in `this.body[index]`
	 */
	replaceInBody(index: number, statement: Statement) {
		statement.rootNode = this.body[index].rootNode;
		statement.indexInRoot = index;
		this.body[index] = statement;

		this.build(this.getLeftPosition());

		if (statement.scope != null) statement.scope.parentScope = this.scope;

		if (statement instanceof VarAssignmentStmt) {
			this.getModule().addVariableButtonToToolbox(statement);
			this.scope.references.push(new Reference(statement, this.scope));
		}

		if (statement.body.length > 0) {
			// have to add another line as well: rebuild

			for (let i = index + 1; i < this.body.length; i++) {
				this.body[i].build(new monaco.Position(this.body[i].lineNumber + 1, this.body[i].left));
	
				if (this.bodyBoundary.right < this.body[i].right) this.bodyBoundary.right = this.body[i].right;
			}	

			// update the boundaries:
			this.bodyBoundary.bottomLine = this.body[this.body.length - 1].lineNumber;


			if (this.rootNode instanceof Statement && this.rootNode.body.length > 0)
				this.rootNode.incrementLineNumbers(this.indexInRoot + 1);
			else if (this.rootNode instanceof Module) this.rootNode.incrementLineNumbers(this.indexInRoot + 1);
		}
	}

	/**
	 * Adds `code` to the body at the given index
	 * @param code the statement to be added
	 * @param index the index to add the `code` statement
	 */
	addStatement(code: Statement, index: number) {
		this.body.splice(index, 0, code);

		for (let i = index + 1; i < this.body.length; i++) {
			this.body[i].indexInRoot++;
			this.body[i].build(new monaco.Position(this.body[i].lineNumber + 1, this.body[i].left));

			if (this.bodyBoundary.right < this.body[i].right) this.bodyBoundary.right = this.body[i].right;
		}

		// update the boundaries:
		this.bodyBoundary.bottomLine = this.body[this.body.length - 1].lineNumber;

		// rebuild all parents until Module:
		if (this.rootNode instanceof Statement && this.rootNode.body.length > 0)
			this.rootNode.incrementLineNumbers(this.indexInRoot + 1);
		else if (this.rootNode instanceof Module) this.rootNode.incrementLineNumbers(this.indexInRoot + 1);
	}

	incrementLineNumbers(fromIndex: number) {
		for (let i = fromIndex; i < this.body.length; i++) {
			this.body[i].build(new monaco.Position(this.body[i].lineNumber + 1, this.body[i].left));

			if (this.bodyBoundary.right < this.body[i].right) this.bodyBoundary.right = this.body[i].right;
		}

		this.bodyBoundary.bottomLine = this.body[this.body.length - 1].lineNumber;

		// rebuild all parents until Module:
		if (this.rootNode instanceof Statement && this.rootNode.body.length > 0)
			this.rootNode.incrementLineNumbers(this.indexInRoot + 1);
		else if (this.rootNode instanceof Module) this.rootNode.incrementLineNumbers(this.indexInRoot + 1);
	}

	getRenderText(): string {
		let txt: string = '';

		for (let token of this.tokens) txt += token.getRenderText();

		let leftPosToCheck = 1;
		let textToAdd = '\n';

		if (this.body.length > 0) {
			leftPosToCheck = this.left + TAB_SPACES - 1;
			if (leftPosToCheck != 1) {
				for (let i = 0; i < leftPosToCheck; i++) textToAdd += ' ';
			}
		}

		for (let stmt of this.body) {
			txt += textToAdd + stmt.getRenderText();
		}

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
				// there is no statement that does not have any editable expression or token, so this should always return something
				if (this.tokens[i].nodeType == NodeType.Expression) return this.tokens[i];
				if (this.tokens[i].nodeType == NodeType.Token) return this.tokens[i];
			}
		}

		return this.getEndOfLineToken();
	}

	getPrevEditableToken(fromIndex?: number): CodeConstruct {
		// let startIndex = fromIndex != undefined ? fromIndex : this.tokens.length - 1;

		if (fromIndex != undefined)
			for (let i = fromIndex; i >= 0; i--) {
				if (this.tokens[i].validEdits.length > 0) {
					if (this.tokens[i].nodeType == NodeType.Expression) return this.tokens[i];
					if (this.tokens[i].nodeType == NodeType.Token) return this.tokens[i];
				}
			}

		return this.getStartOfLineToken();
	}

	getParentStatement(): Statement {
		return this;
	}

	/**
	 * Get end-of-line token for this statement
	 */
	getEndOfLineToken(): CodeConstruct {
		if (this instanceof EmptyLineStmt) return this;

		return this.tokens[this.tokens.length - 1];
	}

	/**
	 * Get start-of-line token for this statement
	 */
	getStartOfLineToken(): CodeConstruct {
		if (this instanceof EmptyLineStmt) return this;

		return this.tokens[0];
	}

	/**
	 * Returns the Module
	 * @returns the parent module of the whole system
	 */
	getModule(): Module {
		if (this.rootNode instanceof Module) return this.rootNode
		else return (this.rootNode as Statement).getModule()
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
				if (this.tokens[i].nodeType == NodeType.Expression) return this.tokens[i];
				if (this.tokens[i].nodeType == NodeType.Token) return this.tokens[i];
			}
		}

		if (this.rootNode instanceof Expression && !this.rootNode.isStatement())
			return this.rootNode.getNextEditableToken(this.indexInRoot + 1);
		else if (this.rootNode instanceof Expression && this.rootNode.isStatement())
			return (this.rootNode as Statement).getNextEditableToken(this.indexInRoot + 1);
		else if (this.rootNode instanceof Statement && this.rootNode.body.length == 0)
			return (this.rootNode as Statement).getNextEditableToken(this.indexInRoot + 1);

		return this.getEndOfLineToken();
	}

	getPrevEditableToken(fromIndex?: number): CodeConstruct {
		if (fromIndex != undefined) {
			for (let i = fromIndex; i >= 0; i--) {
				if (this.tokens[i].validEdits.length > 0) {
					if (this.tokens[i].nodeType == NodeType.Expression) return this.tokens[i];
					if (this.tokens[i].nodeType == NodeType.Token) return this.tokens[i];
				}
			}
		}

		let prevToken: CodeConstruct = null;

		if (this.rootNode instanceof Expression) prevToken = this.rootNode.getPrevEditableToken();
		else if (this.rootNode instanceof Expression && this.rootNode.isStatement())
			prevToken = (this.rootNode as Statement).getPrevEditableToken();
		else if (this.rootNode instanceof Statement && this.rootNode.body.length == 0)
			prevToken = (this.rootNode as Statement).getPrevEditableToken();

		if (this.rootNode instanceof Expression) prevToken = this.rootNode as Expression;
		else if (this.rootNode instanceof Statement && this.rootNode.body.length == 0)
			prevToken = this.rootNode as Statement;

		if (prevToken == null && this.isStatement()) prevToken = this.getStartOfLineToken();

		return prevToken;
	}

	getParentStatement(): Statement {
		if (this.isStatement()) return this as Statement;
		else if (this.rootNode.nodeType == NodeType.Statement) return this.rootNode as Statement;
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
	boundary: Boundary;

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

		this.boundary = new Boundary(pos.lineNumber, pos.lineNumber, this.left, this.right);

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
		return this.boundary.contains(pos);
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
		// should not be called when inside the characters of an editable token

		return this.rootNode.getNextEditableToken(this.indexInRoot + 1);
	}

	getPrevEditableToken(): CodeConstruct {
		// should not be called when inside the characters of an editable token
		if (this.rootNode.validEdits.length > 0) return this.rootNode;
		else return this.rootNode.getPrevEditableToken(this.indexInRoot - 1);

		// return this.rootNode;
	}

	getParentStatement(): Statement {
		if (
			this.rootNode.nodeType == NodeType.Statement ||
			(this.rootNode.nodeType == NodeType.Expression && (this.rootNode as Expression).isStatement())
		)
			return this.rootNode as Statement;
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

export class Boundary {
	topLine: number;
	bottomLine: number;
	left: number;
	right: number;

	constructor(topLine: number, bottomLine: number, left: number, right: number) {
		this.topLine = topLine;
		this.bottomLine = bottomLine;
		this.left = left;
		this.right = right;
	}

	contains(pos: monaco.Position): boolean {
		if (
			pos.lineNumber >= this.topLine &&
			pos.lineNumber <= this.bottomLine &&
			pos.column >= this.left &&
			pos.column <= this.right + 1
		)
			return true;

		return false;
	}
}

export class WhileStatement extends Statement {
	codeClass = CodeClass.WhileStatement;
	addableType = AddableType.Statement;
	private conditionIndex: number;
	scope: Scope;

	constructor(root?: CodeConstruct | Module, indexInRoot?: number) {
		super();

		this.validEdits.push(EditFunctions.RemoveStatement);

		this.tokens.push(new StartOfLineTkn(this, this.tokens.length));
		this.tokens.push(new KeywordTkn('while', this, this.tokens.length));
		this.tokens.push(new PunctuationTkn(' ', this, this.tokens.length));
		this.conditionIndex = this.tokens.length;
		this.tokens.push(new EmptyExpr(this, this.tokens.length));
		this.tokens.push(new PunctuationTkn(' ', this, this.tokens.length));
		this.tokens.push(new PunctuationTkn(':', this, this.tokens.length));
		this.tokens.push(new EndOfLineTkn(this, this.tokens.length));

		this.body.push(new EmptyLineStmt(this, 0));
		this.scope = new Scope();

		this.hasEmptyToken = true;
	}

	replaceCondition(expr: Expression) {
		this.replace(expr, this.conditionIndex);
	}
}
export class IfStatement extends Statement {
	codeClass = CodeClass.IfStatement;
	addableType = AddableType.Statement;
	private conditionIndex: number;

	constructor(root?: CodeConstruct | Module, indexInRoot?: number) {
		super();

		this.validEdits.push(EditFunctions.RemoveStatement);

		this.tokens.push(new StartOfLineTkn(this, this.tokens.length));
		this.tokens.push(new KeywordTkn('if', this, this.tokens.length));
		this.tokens.push(new PunctuationTkn(' ', this, this.tokens.length));
		this.conditionIndex = this.tokens.length;
		this.tokens.push(new EmptyExpr(this, this.tokens.length));
		this.tokens.push(new PunctuationTkn(' ', this, this.tokens.length));
		this.tokens.push(new PunctuationTkn(':', this, this.tokens.length));
		this.tokens.push(new EndOfLineTkn(this, this.tokens.length));

		this.body.push(new EmptyLineStmt(this, 0));
		this.scope = new Scope();

		this.hasEmptyToken = true;
	}

	replaceCondition(expr: Expression) {
		this.replace(expr, this.conditionIndex);
	}
}

export class ForStatement extends Statement {
	codeClass = CodeClass.ForStatement;
	addableType = AddableType.Statement;
	private counterIndex: number;
	private rangeIndex: number;

	constructor(root?: CodeConstruct | Module, indexInRoot?: number) {
		super();

		this.validEdits.push(EditFunctions.RemoveStatement);

		this.tokens.push(new StartOfLineTkn(this, this.tokens.length));
		this.tokens.push(new KeywordTkn('for', this, this.tokens.length));
		this.tokens.push(new PunctuationTkn(' ', this, this.tokens.length));
		this.counterIndex = this.tokens.length;
		this.tokens.push(new IdentifierTkn('---', this, this.tokens.length));
		this.tokens.push(new PunctuationTkn(' ', this, this.tokens.length));
		this.tokens.push(new KeywordTkn('in', this, this.tokens.length));
		this.tokens.push(new PunctuationTkn(' ', this, this.tokens.length));
		this.rangeIndex = this.tokens.length;
		this.tokens.push(new EmptyExpr(this, this.tokens.length));
		this.tokens.push(new PunctuationTkn(' ', this, this.tokens.length));
		this.tokens.push(new PunctuationTkn(':', this, this.tokens.length));
		this.tokens.push(new EndOfLineTkn(this, this.tokens.length));

		this.body.push(new EmptyLineStmt(this, 0));
		this.scope = new Scope();

		this.hasEmptyToken = true;
	}

	replaceCounter(expr: Expression) {
		this.replace(expr, this.counterIndex);
	}

	replaceRange(expr: Expression) {
		this.replace(expr, this.rangeIndex);
	}
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

		this.boundary = new Boundary(pos.lineNumber, pos.lineNumber, this.left, this.right);

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

	getNextEditableToken(): CodeConstruct {
		if (this.rootNode instanceof Statement && this.rootNode.body.length > 0) {
			if (this.indexInRoot + 1 < this.rootNode.body.length)
				return this.rootNode.body[this.indexInRoot + 1].getStartOfLineToken();
			else {
				// find if there is another statement below this compound statement that we should jump to the first token of it

				let compoundStmt = this.rootNode;

				if (
					compoundStmt.rootNode instanceof Module &&
					compoundStmt.indexInRoot + 1 < compoundStmt.rootNode.body.length
				)
					return compoundStmt.rootNode.body[compoundStmt.indexInRoot + 1].getStartOfLineToken();
				else if (
					compoundStmt.rootNode instanceof Statement &&
					compoundStmt.rootNode.body.length > 0 &&
					compoundStmt.indexInRoot + 1 < compoundStmt.rootNode.body.length
				)
					return compoundStmt.rootNode.body[compoundStmt.indexInRoot + 1].getStartOfLineToken();
				else return this;
			}
		} else if (this.rootNode instanceof Module) {
			let module = this.rootNode as Module;

			if (this.indexInRoot + 1 < module.body.length) {
				return module.body[this.indexInRoot + 1].getStartOfLineToken();
			} else return this;
		}
	}

	getPrevEditableToken(): CodeConstruct {
		if (this.rootNode instanceof Statement && this.rootNode.body.length > 0) {
			if (this.indexInRoot == 0) return this.rootNode.getEndOfLineToken();
			else return this.rootNode.body[this.indexInRoot - 1].getEndOfLineToken();
		} else if (this.rootNode instanceof Module) {
			if (this.indexInRoot == 0) return this;
			else return this.rootNode.body[this.indexInRoot - 1].getStartOfLineToken();
		}
	}
}

export class VarAssignmentStmt extends Statement {
	static uniqueId: number = 0;
	buttonId: string;
	codeClass = CodeClass.VarAssignStatement;
	addableType = AddableType.Statement;
	private identifierIndex: number;
	private valueIndex: number;
	dataType = DataType.Any;

	constructor(id?: string, root?: CodeConstruct | Module, indexInRoot?: number) {
		super();

		this.buttonId = "add-var-ref-" + VarAssignmentStmt.uniqueId;
		VarAssignmentStmt.uniqueId++

		this.rootNode = root;
		this.indexInRoot = indexInRoot;

		this.validEdits.push(EditFunctions.RemoveStatement);

		this.tokens.push(new StartOfLineTkn(this, this.tokens.length));
		this.identifierIndex = this.tokens.length;
		this.tokens.push(new IdentifierTkn(id, this, this.tokens.length));
		this.tokens.push(new PunctuationTkn(' ', this, this.tokens.length));
		this.tokens.push(new OperatorTkn('=', this, this.tokens.length));
		this.tokens.push(new PunctuationTkn(' ', this, this.tokens.length));
		this.valueIndex = this.tokens.length;
		this.tokens.push(new EmptyExpr(this, this.tokens.length));
		this.tokens.push(new EndOfLineTkn(this, this.tokens.length));

		this.hasEmptyToken = true;
	}

	replaceIdentifier(code: CodeConstruct) {
		this.replace(code, this.identifierIndex);
	}

	replaceValue(code: CodeConstruct) {
		this.replace(code, this.valueIndex);
	}

	rebuild(pos: monaco.Position, fromIndex: number) {
		super.rebuild(pos, fromIndex);

		this.updateButton();
	}

	getIdentifier(): string {
		return this.tokens[this.identifierIndex].getRenderText()
	}

	updateButton() {
		document.getElementById(this.buttonId).innerHTML = this.getIdentifier();
	}
}

export class VariableReferenceExpr extends Expression {
	codeClass = CodeClass.VariableReferenceExpr;
	isEmpty = false;
	addableType = AddableType.Expression;
	identifier: string;

	constructor(id: string, returns: DataType, root?: CodeConstruct, indexInRoot?: number) {
		super(returns);

		this.tokens.push(new NonEditableTextTkn(id))

		this.identifier = id;
		this.rootNode = root;
		this.indexInRoot = indexInRoot;
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

		if (this.isStatement()) this.tokens.push(new StartOfLineTkn(this, this.tokens.length));

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
		if (this.isStatement()) this.tokens.push(new EndOfLineTkn(this, this.tokens.length));

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

export class UnaryOperatorExpr extends Expression {
	codeClass = CodeClass.UnaryExpression;
	addableType = AddableType.Expression;
	operator: UnaryOp;
	private operandIndex: number;

	constructor(operator: UnaryOp, returns: DataType, root?: CodeConstruct, indexInRoot?: number) {
		super(returns);

		this.rootNode = root;
		this.indexInRoot = indexInRoot;
		this.operator = operator;

		this.addableType = AddableType.Expression;
		this.validEdits.push(EditFunctions.RemoveExpression);

		this.tokens.push(new PunctuationTkn('(', this, this.tokens.length));
		this.tokens.push(new OperatorTkn(operator, this, this.tokens.length));
		this.tokens.push(new PunctuationTkn(' ', this, this.tokens.length));
		this.operandIndex = this.tokens.length;
		this.tokens.push(new EmptyExpr(this, this.tokens.length));
		this.tokens.push(new PunctuationTkn(')', this, this.tokens.length));

		this.hasEmptyToken = true;
	}

	replaceOperand(code: CodeConstruct) {
		this.replace(code, this.operandIndex);
	}
}

export class BinaryBoolOperatorExpr extends Expression {
	codeClass = CodeClass.BinaryBoolExpression;
	addableType = AddableType.Expression;
	operator: BoolOperator;
	private leftOperandIndex: number;
	private rightOperandIndex: number;

	constructor(operator: BoolOperator, root?: CodeConstruct, indexInRoot?: number) {
		super(DataType.Boolean);

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

export class ComparatorExpr extends Expression {
	codeClass = CodeClass.ComparatorExpression;
	addableType = AddableType.Expression;
	operator: ComparatorOp;
	private leftOperandIndex: number;
	private rightOperandIndex: number;

	constructor(operator: ComparatorOp, root?: CodeConstruct, indexInRoot?: number) {
		super(DataType.Boolean);

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

	getSelection(): monaco.Selection {
		let leftPos = this.getLeftPosition();
		return new monaco.Selection(leftPos.lineNumber, leftPos.column, leftPos.lineNumber, leftPos.column);
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

		this.boundary = new Boundary(pos.lineNumber, pos.lineNumber, this.left, this.right + 1);

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

		this.validEdits.push(EditFunctions.RemoveExpression);
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

	contains(pos: monaco.Position): boolean {
		if (pos.column >= this.left && pos.column <= this.right + 1) return true;

		return false;
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

export class EndOfLineTkn extends Token {
	codeClass = CodeClass.EndOfLineToken;
	isEmpty = false;

	constructor(root?: CodeConstruct, indexInRoot?: number) {
		super('');

		this.rootNode = root;
		this.indexInRoot = indexInRoot;
	}

	getPrevEditableToken(): CodeConstruct {
		return this.rootNode.getPrevEditableToken(this.indexInRoot - 1);
	}

	getNextEditableToken(): CodeConstruct {
		let parentStmt = this.getParentStatement();

		if (parentStmt instanceof Statement && parentStmt.body.length > 0)
			// we're at the header of this compound statement:
			return parentStmt.body[0].getStartOfLineToken();

		if (parentStmt.rootNode instanceof Statement && parentStmt.rootNode.body.length > 0) {
			if (parentStmt.indexInRoot + 1 < parentStmt.rootNode.body.length)
				return parentStmt.rootNode.body[parentStmt.indexInRoot + 1].getStartOfLineToken();
			else {
				// at the end of a compound statement: move to the parent's root's next statement
				let compoundParentsRoot = parentStmt.rootNode.rootNode;

				if (compoundParentsRoot instanceof Module)
					if (parentStmt.rootNode.indexInRoot + 1 < compoundParentsRoot.body.length)
						return compoundParentsRoot.body[parentStmt.rootNode.indexInRoot + 1].getStartOfLineToken();
					else if (compoundParentsRoot instanceof Statement && compoundParentsRoot.body.length > 0)
						if (parentStmt.rootNode.indexInRoot + 1 < compoundParentsRoot.body.length)
							return compoundParentsRoot.body[parentStmt.rootNode.indexInRoot + 1].getStartOfLineToken();

				return this;
			}
		} else if (parentStmt.rootNode instanceof Module) {
			if (parentStmt.indexInRoot + 1 < parentStmt.rootNode.body.length) {
				let lineBelow = parentStmt.rootNode.body[parentStmt.indexInRoot + 1];

				if (lineBelow instanceof EmptyLineStmt) return lineBelow;
				else return lineBelow.getStartOfLineToken();
			} else return this;
		}
	}

	getSelection(): monaco.Selection {
		let line = this.getLineNumber();

		return new monaco.Selection(line, this.right + 1, line, this.right + 1);
	}
}

export class StartOfLineTkn extends Token {
	codeClass = CodeClass.StartOfLineToken;
	isEmpty = false;

	constructor(root?: CodeConstruct, indexInRoot?: number) {
		super('');

		this.rootNode = root;
		this.indexInRoot = indexInRoot;
	}

	getNextEditableToken(): CodeConstruct {
		// should select the whole statement
		return this.rootNode;
	}

	getPrevEditableToken(): CodeConstruct {
		let parentStmt = this.getParentStatement();

		if (parentStmt.rootNode instanceof Statement && parentStmt.rootNode.body.length > 0) {
			if (parentStmt.indexInRoot == 0) return parentStmt.rootNode.getEndOfLineToken();
			else return parentStmt.rootNode.body[parentStmt.indexInRoot - 1].getEndOfLineToken();
		} else if (parentStmt.rootNode instanceof Module) {
			if (parentStmt.indexInRoot > 0) {
				let lineAbove = parentStmt.rootNode.body[parentStmt.indexInRoot - 1];

				if (lineAbove instanceof EmptyLineStmt) return lineAbove;
				else return lineAbove.getEndOfLineToken();
			} else return this;
		}
	}

	getSelection(): monaco.Selection {
		let line = this.getLineNumber();

		return new monaco.Selection(line, this.left, line, this.left);
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

export class KeywordTkn extends Token {
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

	scope: Scope;
	editor: monaco.editor.IStandaloneCodeEditor;
	eventHandler: EventHandler;

	constructor(editorId: string) {
		this.editor = monaco.editor.create(document.getElementById(editorId), {
			value: '',
			language: 'python',
			minimap: { enabled: false }
		});

		this.body.push(new EmptyLineStmt(this, 0));
		this.scope = new Scope();
		this.focusedNode = this.body[0];
		this.focusedNode.build(new monaco.Position(1, 1));
		this.editor.focus();

		this.eventHandler = new EventHandler(this);
	}

	addVariableButtonToToolbox(ref: VarAssignmentStmt) {
		let button = document.createElement("div")
		button.id = ref.buttonId;
		button.className = "toolbox-btn"

		document.getElementById("variables").appendChild(button)
		
		button.addEventListener("click", () => {
			this.insert(new VariableReferenceExpr(ref.getIdentifier(), ref.dataType))
		})
	}

	incrementLineNumbers(fromIndex: number) {
		for (let i = fromIndex; i < this.body.length; i++)
			this.body[i].build(new monaco.Position(this.body[i].lineNumber + 1, this.body[i].left));
	}

	addStatement(code: Statement, index: number) {
		this.body.splice(index, 0, code);

		for (let i = index + 1; i < this.body.length; i++) {
			this.body[i].indexInRoot++;
			this.body[i].build(new monaco.Position(this.body[i].lineNumber + 1, 1));
		}

		if (code instanceof VarAssignmentStmt) { 
			this.addVariableButtonToToolbox(code);
			this.scope.references.push(new Reference(code, this.scope));
		}
	}

	focusSelection(selection: monaco.Selection) {
		if (selection.startColumn == selection.endColumn)
			this.editor.setPosition(new monaco.Position(selection.startLineNumber, selection.startColumn));
		else this.editor.setSelection(selection);
	}

	locateStatement(pos: monaco.Position): Statement {
		let stmt: Statement = null;

		for (let line of this.body) {
			stmt = line.getContainingStatement(pos);

			if (stmt != null) return stmt;
		}

		throw new Error('The clicked position did not match any of the statements in the module.');
	}

	insertEmptyLine() {
		let curPos = this.editor.getPosition();
		let curStatement = this.locateStatement(curPos);

		let parentRoot = this.focusedNode.getParentStatement().rootNode;
		let leftPosToCheck = 1;
		let parentStmtHasBody = false;
		let textToAdd = '\n';
		let spaces = '';

		if (parentRoot instanceof Statement && parentRoot.body.length > 0) {
			// is inside the body of another statement
			leftPosToCheck = parentRoot.left + TAB_SPACES;
			parentStmtHasBody = true;

			if (leftPosToCheck != 1) {
				for (let i = 0; i < parentRoot.left + TAB_SPACES - 1; i++) spaces += ' ';
			}
		}

		if (curPos.column == leftPosToCheck) {
			// insert emptyStatement at this line, move other statements down
			let emptyLine = new EmptyLineStmt(parentStmtHasBody ? parentRoot : this, curStatement.indexInRoot);

			emptyLine.build(curStatement.getLeftPosition());

			if (parentStmtHasBody) (parentRoot as Statement).addStatement(emptyLine, curStatement.indexInRoot);
			else this.addStatement(emptyLine, curStatement.indexInRoot);

			this.editor.executeEdits('module', [
				{
					range: {
						endColumn: 1,
						endLineNumber: curStatement.lineNumber - 1,
						startColumn: 1,
						startLineNumber: curStatement.lineNumber - 1
					},
					text: spaces + textToAdd,
					forceMoveMarkers: true
				}
			]);
		} else {
			// insert emptyStatement on next line, move other statements down
			let emptyLine = new EmptyLineStmt(parentStmtHasBody ? parentRoot : this, curStatement.indexInRoot + 1);
			emptyLine.build(new monaco.Position(curStatement.lineNumber + 1, leftPosToCheck));

			if (parentStmtHasBody) (parentRoot as Statement).addStatement(emptyLine, curStatement.indexInRoot + 1);
			else this.addStatement(emptyLine, curStatement.indexInRoot + 1);

			this.editor.executeEdits('module', [
				{
					range: {
						endColumn: this.focusedNode.right + 1,
						endLineNumber: curStatement.lineNumber,
						startColumn: this.focusedNode.right + 1,
						startLineNumber: curStatement.lineNumber
					},
					text: textToAdd + spaces,
					forceMoveMarkers: true
				}
			]);

			this.focusedNode = emptyLine;
		}
	}

	replaceFocusedStatement(stmt: Statement) {
		this.body[this.focusedNode.indexInRoot] = stmt;
		stmt.rootNode = this.focusedNode.rootNode;
		stmt.indexInRoot = this.focusedNode.indexInRoot;
		stmt.build(this.focusedNode.getLeftPosition());

		if (stmt.scope != null) stmt.scope.parentScope = this.scope;

		if (stmt instanceof VarAssignmentStmt) {
			this.addVariableButtonToToolbox(stmt);
			this.scope.references.push(new Reference(stmt, this.scope));
		}

		if (stmt.body.length > 0) {
			// if stmt is compound, then rebuild all of the bottom statements as well.
			this.incrementLineNumbers(stmt.indexInRoot + 1);
		}
	}

	replaceFocusedExpression(expr: Expression) {
		let root = this.focusedNode.rootNode as Statement;

		root.replace(expr, this.focusedNode.indexInRoot);
		expr.rootNode = this.focusedNode.rootNode;
		expr.indexInRoot = this.focusedNode.indexInRoot;
	}

	referenceTable = new Array<Reference>();

	insert(code: CodeConstruct) {
		if (code.addableType != AddableType.NotAddable && this.focusedNode.receives.indexOf(code.addableType) > -1) {
			let focusedPos = this.focusedNode.getLeftPosition();
			let parentRoot = this.focusedNode.getParentStatement().rootNode;

			if (this.focusedNode.receives.indexOf(AddableType.Statement) > -1) {
				// replaces statement with the newly inserted statement
				let statement = code as Statement;

				if (parentRoot instanceof Statement && parentRoot.body.length > 0) {
					// has body:
					console.log(parentRoot.scope.getValidReferences(focusedPos.lineNumber));
					parentRoot.replaceInBody(this.focusedNode.indexInRoot, statement);
				} else {
					console.log(this.scope.getValidReferences(focusedPos.lineNumber));
					this.replaceFocusedStatement(statement);
				}

				let range = new monaco.Range(
					focusedPos.lineNumber,
					statement.left,
					focusedPos.lineNumber,
					statement.right
				);

				this.editor.executeEdits('module', [
					{ range: range, text: statement.getRenderText(), forceMoveMarkers: true }
				]);
			} else if (this.focusedNode.receives.indexOf(AddableType.Expression) > -1) {
				// replaces expression with the newly inserted expression
				let expr = code as Expression;

				this.replaceFocusedExpression(expr);

				let range = new monaco.Range(
					focusedPos.lineNumber,
					this.focusedNode.left,
					focusedPos.lineNumber,
					this.focusedNode.right + 1
				);

				this.editor.executeEdits('module', [
					{ range: range, text: expr.getRenderText(), forceMoveMarkers: true }
				]);
			}

			this.focusedNode = code.nextEmptyToken();

			this.focusSelection(this.focusedNode.getSelection());
			this.editor.focus();
		} else console.warn('Cannot insert this code construct at focused location.');
	}
}

/**
 * These scopes are created by multi-line statements
 */
export class Scope {
	startLineNumber: number;
	endLineNumber: number;
	parentScope: Scope = null;

	references = new Array<Reference>();

	getValidReferences(line: number): Array<Reference> {
		let validReferences = this.references.filter((ref) => ref.line() < line);

		if (this.parentScope != null)
			validReferences = validReferences.concat(this.parentScope.getValidReferences(line));

		return validReferences;
	}
}

export class Reference {
	/**
	 * Currently, either a variable or a function declaration. Could later be a class declaration.
	 */
	statement: Statement;

	/**
	 * The valid scope in which this item could be referenced.
	 */
	scope: Scope;

	constructor(statement: Statement, scope: Scope) {
		this.statement = statement;
		this.scope = scope;
	}

	line(): number {
		return this.statement.lineNumber;
	}
}
