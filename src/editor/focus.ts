import * as monaco from 'monaco-editor';
import * as ast from '../syntax-tree/ast';

export class Focus {
	module: ast.Module;

	/**
	 * If the focus is on or within a token, this will have its value, otherwise it will be null.
	 */
	focusedToken: ast.CodeConstruct;

	/**
	 * The statement in which we are focused in
	 */
	focusedStatement: ast.Statement;

	// these selections occur using the mouse drag or shift arrow key
	// multiToken; // array of tokens that the user has selected
	// multiStatement; // array of statements that the user has selected

	constructor(module: ast.Module) {
		this.module = module;
	}

	/**
	 * This is mostly called from the AST, for example after a code has been inserted and the cursor should focus to
	 * the first empty hole or after the inserted code.
	 */
	update(navFocus: NavigationFocus) {
		if (navFocus.position == null && navFocus.token != null) {
			this.focusedToken = navFocus.token;
			this.focusedStatement = navFocus.token.getParentStatement();

			let selection = new monaco.Selection(
				navFocus.token.getLineNumber(),
				navFocus.token.right,
				navFocus.token.getLineNumber(),
				navFocus.token.left
			);
			this.module.editor.monaco.setSelection(selection);
		} else if (navFocus.position != null && navFocus.token == null) {
			this.focusedToken = null;
			this.focusedStatement = null;

			this.module.editor.monaco.setPosition(navFocus.position);
		} else if (navFocus.token != null && navFocus.select == false) {
			this.focusedToken = navFocus.token;
			this.focusedStatement = navFocus.token.getParentStatement();
		}
	}

	private selectFocusedToken() {
		if (this.focusedToken != null) {
			let selection = new monaco.Selection(
				this.focusedToken.getLineNumber(),
				this.focusedToken.right,
				this.focusedToken.getLineNumber(),
				this.focusedToken.left
			);

			this.module.editor.monaco.setSelection(selection);
		}
	}

	navigatePos(pos: monaco.Position): NavigationFocus {
		let navFocus = new NavigationFocus();
		navFocus.select = true;
		this.focusedStatement = this.getStatementAtLineNumber(pos.lineNumber);

		// if what the user has clicked on is a hole => select it
		// o.w. just set this.focusedToken to null and set the cursor to either the beginning or the end of it (based on its position)

		/**
		 * selectable items:
		 * empty holes
		 * 
		 */

		/**
		 * Clicking within literals => should put the cursor right there
		 */

		// click non-selectable things:
		// beginning
		// ending

		// clicked at an empty statement => just update focusedStatement
		if (this.focusedStatement instanceof ast.EmptyLineStmt) {
			navFocus.position = new monaco.Position(pos.lineNumber, this.focusedStatement.left);
			// TODO
			// TODO: THIS IS TEMPORARY JUST TO UPDATE FOCUSEDNODE IN AST.
			// TODO
			navFocus.token = this.focusedStatement;

			this.focusedToken = null;
			this.module.editor.monaco.setPosition(navFocus.position);

			return navFocus;
		}

		// clicked before a statement => navigate to the beginning of the statement
		if (pos.column <= this.focusedStatement.left) {
			navFocus.position = new monaco.Position(pos.lineNumber, this.focusedStatement.left);
			this.focusedToken = navFocus.token = null;
			this.module.editor.monaco.setPosition(navFocus.position);

			return navFocus;
		}

		// clicked before a statement => navigate to the end of the line
		if (pos.column >= this.focusedStatement.right) {
			navFocus.position = new monaco.Position(pos.lineNumber, this.focusedStatement.right);
			this.focusedToken = navFocus.token = null;
			this.module.editor.monaco.setPosition(navFocus.position);

			return navFocus;
		}

		// look into the tokens of the statement:
		this.focusedToken = this.getTokenAtStatementColumn(this.focusedStatement, pos.column);

		if (this.focusedToken instanceof ast.Token && this.focusedToken.isEmpty) {
			// if clicked on a hole => select the hole
			this.selectFocusedToken();
			navFocus.token = this.focusedToken;
			navFocus.position = null;

			return navFocus;
		} else if (this.focusedToken instanceof ast.EditableTextTkn || this.focusedToken instanceof ast.IdentifierTkn) {
			// if clicked on a text-editable code construct (identifier or a literal) => navigate to the clicked position
			navFocus.token = this.focusedToken;
			navFocus.position = null;

			if (this.focusedToken.text.length != 0) navFocus.select = false;

			return navFocus;
		} else {
			let hitDistance = pos.column - this.focusedToken.left;
			let tokenLength = this.focusedToken.right - this.focusedToken.left + 1;

			if (hitDistance < tokenLength / 2) {
				// go to the beginning (or the empty token before this)

				if (this.focusedToken.left - 1 > this.focusedStatement.left) {
					let tokenBefore = this.getTokenAtStatementColumn(this.focusedStatement, this.focusedToken.left - 1);

					if (tokenBefore instanceof ast.Token && tokenBefore.isEmpty) {
						this.focusedToken = tokenBefore;

						this.selectFocusedToken();

						navFocus.token = this.focusedToken;
						navFocus.position = null;

						return navFocus;
					} else if (tokenBefore instanceof ast.Token && (tokenBefore instanceof ast.EditableTextTkn || tokenBefore instanceof ast.IdentifierTkn)) {
						this.focusedToken = navFocus.token = tokenBefore;
						navFocus.select = false;
						navFocus.position = null;

						return navFocus;
					}
				}

				navFocus.token = null;
				navFocus.position = new monaco.Position(pos.lineNumber, this.focusedToken.left);
				this.module.editor.monaco.setPosition(navFocus.position);

				return navFocus;
			} else {
				// navigate to the end (or the empty token right after this token)

				let tokenAfter = this.getTokenAtStatementColumn(this.focusedStatement, this.focusedToken.right + 1);

				if (tokenAfter instanceof ast.Token && tokenAfter.isEmpty) {
					this.focusedToken = tokenAfter;

					this.selectFocusedToken();

					navFocus.token = this.focusedToken;
					navFocus.position = null;

					return navFocus;
				} else {
					navFocus.token = null;
					navFocus.position = new monaco.Position(pos.lineNumber, this.focusedToken.right);
					this.module.editor.monaco.setPosition(navFocus.position);

					return navFocus;
				}
			}
		}
	}

	navigateUp() : NavigationFocus {
		let curPosition = this.module.editor.monaco.getPosition();

		if (curPosition.lineNumber > 1)
			return this.navigatePos(new monaco.Position(curPosition.lineNumber - 1, curPosition.column));
		else return this.navigatePos(new monaco.Position(curPosition.lineNumber, 1));
	}

	navigateDown()  : NavigationFocus{
		let navFocus = new NavigationFocus();

		// could try doing navigatePos(down) 
		// if null => just go to the end of the line

		return navFocus;
	}

	navigateRight()  : NavigationFocus{
		let navFocus = new NavigationFocus();
		navFocus.token = this.focusedToken;

		if (this.onEndOfLine()) {
			// same code as navigateDown (just to the beginning of down)
			console.log("+ 1 is down")
		} else {
			let curSelection = this.module.editor.monaco.getSelection();
			let curPos = this.module.editor.monaco.getPosition();
			let nextColumn = curPos.column;

			if (curSelection.endColumn != curSelection.startColumn)
				nextColumn = curSelection.endColumn;

			let tokenAfter = this.getTokenAtStatementColumn(this.focusedStatement, nextColumn);

			if (tokenAfter instanceof ast.NonEditableTkn) {
				// should skip this NonEditableTkn, and move to the next thing after it.

				let tokenAfterAfter = this.getTokenAtStatementColumn(this.focusedStatement, tokenAfter.right);

				if (tokenAfterAfter instanceof ast.Token && tokenAfterAfter.isEmpty) {
					this.focusedToken = tokenAfterAfter;

					this.selectFocusedToken();

					navFocus.token = this.focusedToken;
					navFocus.position = null;

					return navFocus;
				} else if (tokenAfterAfter instanceof ast.EditableTextTkn || tokenAfterAfter instanceof ast.IdentifierTkn) {
					navFocus.position = new monaco.Position(curPos.lineNumber, tokenAfterAfter.left);
					this.module.editor.monaco.setPosition(navFocus.position);

					this.focusedToken = navFocus.token = tokenAfterAfter;
					navFocus.select = false;

					return navFocus;
				} else if (tokenAfterAfter != null){
					// probably its another expression, but should go to the beginning of it
					navFocus.position = new monaco.Position(curPos.lineNumber, tokenAfterAfter.left);
					this.module.editor.monaco.setPosition(navFocus.position);

					this.focusedToken = navFocus.token = null;

					return navFocus;
				}else {
					navFocus.position = new monaco.Position(curPos.lineNumber, tokenAfter.right);
					this.module.editor.monaco.setPosition(navFocus.position);

					this.focusedToken = navFocus.token = null;

					return navFocus;

				}


			} else if (tokenAfter instanceof ast.Token && tokenAfter.isEmpty) {
				// if char[col + 1] is H => just select H
				console.log("+1 is H")

				navFocus.token = tokenAfter;
				navFocus.position = null;

				this.selectFocusedToken();

			} else if (tokenAfter instanceof ast.EditableTextTkn || tokenAfter instanceof ast.IdentifierTkn) {
				// if char[col + 1] is a literal => go through it
				console.log("+1 is L")

				navFocus.position = new monaco.Position(curPos.lineNumber, tokenAfter.left);
				this.module.editor.monaco.setPosition(navFocus.position);

				this.focusedToken = navFocus.token = tokenAfter;
				navFocus.select = false;
			}
		}

		return navFocus;
	}

	navigateLeft() : NavigationFocus {
		let navFocus = new NavigationFocus();
		navFocus.token = this.focusedToken;

		if (this.onBeginningOfLine()) {
			// same code as navigateUp (just to the end of up)
			console.log("- 1 is up")
		} else {
			let curSelection = this.module.editor.monaco.getSelection();
			let curPos = this.module.editor.monaco.getPosition();
			let prevColumn = this.module.editor.monaco.getPosition().column - 1;

			if (curSelection.endColumn != curSelection.startColumn)
				prevColumn = curSelection.startColumn - 1

			let tokenBefore = this.getTokenAtStatementColumn(this.focusedStatement, prevColumn);

			if (tokenBefore instanceof ast.NonEditableTkn) {
				// if char[col - 1] is N => just go to the beginning of N
				console.log("-1 is N")

				let tokenBeforeBefore = this.getTokenAtStatementColumn(this.focusedStatement, tokenBefore.left - 1);

				if (tokenBeforeBefore instanceof ast.Token && tokenBeforeBefore.isEmpty) {
					this.focusedToken = tokenBeforeBefore;

					this.selectFocusedToken();

					navFocus.token = this.focusedToken;
					navFocus.position = null;

					return navFocus;
				} else if (tokenBeforeBefore instanceof ast.Token && (tokenBeforeBefore instanceof ast.EditableTextTkn || tokenBeforeBefore instanceof ast.IdentifierTkn)) {
					navFocus.position = new monaco.Position(curPos.lineNumber, tokenBeforeBefore.right);
					this.module.editor.monaco.setPosition(navFocus.position);

					this.focusedToken = navFocus.token = tokenBeforeBefore;
					navFocus.select = false;

					return navFocus;
				} else {
					this.focusedToken = navFocus.token = null;
					navFocus.position = new monaco.Position(curPos.lineNumber, tokenBefore.left);
					this.module.editor.monaco.setPosition(navFocus.position);
	
					return navFocus;
				}


			} else if (tokenBefore instanceof ast.Token && tokenBefore.isEmpty) {
				// if char[col - 1] is H => just select H
				console.log("-1 is H")

				navFocus.token = tokenBefore;
				navFocus.position = null;

				this.selectFocusedToken();

			} else if (tokenBefore instanceof ast.EditableTextTkn) {
				// if char[col - 1] is a literal => go through it
				console.log("-1 is L")
			}
		}

		return navFocus;
	}

	/**
	 * Returns true if the focus is within a text editable token, otherwise, returns false.
	 */
	isTextEditable(): boolean {
		return this.focusedToken != null && this.focusedToken.isTextEditable;
	}

	/**
	 * Returns true if the focus is on an empty line, otherwise, returns false.
	 */
	onEmptyLine(): boolean {
		let curSelection = this.module.editor.monaco.getSelection();

		if (curSelection.startColumn == curSelection.endColumn) {
			let curPosition = curSelection.getStartPosition();

			return this.isEmptyLine(this.module.editor.monaco.getModel().getLineContent(curPosition.lineNumber));
		}

		return false;
	}

	/**
	 * Returns true if the focus is on the end of a line, otherwise, returns false.
	 */
	onEndOfLine(): boolean {
		let curSelection = this.module.editor.monaco.getSelection();

		if (curSelection.startColumn == curSelection.endColumn) {
			let curPosition = curSelection.getStartPosition();

			if (this.focusedStatement != null && curPosition.column == this.focusedStatement.right + 1) return true;
		}

		return false;
	}

	/**
	 * Returns true if the focus is on the beginning of a line, otherwise, returns false.
	 */
	onBeginningOfLine(): boolean {
		let curSelection = this.module.editor.monaco.getSelection();

		// if (curSelection.startColumn == curSelection.endColumn) {
		// 	let curPosition = curSelection.getStartPosition();

		//     if (curPosition.column == 1) return true;

		// 	let lineContent = this.module.editor.monaco.getModel().getLineContent(curPosition.lineNumber);

		//     if (curPosition.column - 1 == ) return true;
		// }

		return false;
	}

	/**
	 * Returns true if a line exists above the focused line, otherwise, returns false.
	 */
	existsLineAbove(): boolean {
		// let curPos = this.module.editor.monaco.getPosition();
		// let lineStmt = this.getStmtFromLine(curPos.lineNumber);

		// if (lineStmt != null) {

		// }

		return false;
	}

	/**
	 * Returns true if a line exists below the focused line, otherwise, returns false.
	 */
	existsLineBelow(): boolean {
		return false;
	}

	private getTokenAtStatementColumn(statement: ast.Statement, column: number): ast.CodeConstruct {
		let tokensStack = new Array<ast.CodeConstruct>();

		for (let token of statement.tokens) tokensStack.unshift(token);

		while (tokensStack.length > 0) {
			let curToken = tokensStack.pop();

			if (column >= curToken.left && column < curToken.right && curToken instanceof ast.Token) return curToken;

			if (curToken instanceof ast.Expression)
				if (curToken.tokens.length > 0) for (let token of curToken.tokens) tokensStack.unshift(token);
				else return curToken;
		}

		return null;
	}

	private getStatementAtLineNumber(line: number): ast.Statement {
		let bodyStack = new Array<ast.Statement>();

		for (let stmt of this.module.body) bodyStack.push(stmt);

		while (bodyStack.length > 0) {
			let curStmt = bodyStack.pop();

			if (line == curStmt.lineNumber) return curStmt;
			else if (curStmt.hasBody()) {
				for (let stmt of curStmt.body) bodyStack.push(stmt);
			}
		}

		return null;
	}

	private isEmptyLine(line: string): boolean {
		return line.trim().length == 0;
	}
}

export class NavigationFocus {
	token?: ast.CodeConstruct = null;
	position?: monaco.Position = null;
	select?: boolean = false;

	setPosition(position: monaco.Position) {
		this.token = null;
		this.position = position;
	}

	setToken(token: ast.CodeConstruct) {
		this.token = token;
		this.position = null;
	}

	/**
	 * token could be null in many circumstances:
	 * - 
	 */
	//
}
