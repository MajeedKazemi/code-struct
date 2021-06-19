import * as ast from '../syntax-tree/ast';
import * as monaco from 'monaco-editor';
import { TAB_SPACES } from '../syntax-tree/keywords';
import * as AST from '../syntax-tree/ast';
import { ErrorMessage } from '../notification-system/error-msg-generator';
import * as keywords from '../syntax-tree/keywords';
import { BinaryOperator, DataType } from '../syntax-tree/ast';
import { ConstructKeys, Util } from '../utilities/util';

export enum KeyPress {
	// navigation:
	ArrowLeft = 'ArrowLeft',
	ArrowRight = 'ArrowRight',
	ArrowUp = 'ArrowUp',
	ArrowDown = 'ArrowDown',

	Home = 'Home',
	End = 'End',

	// delete:
	Delete = 'Delete',
	Backspace = 'Backspace',

	// enter:
	Enter = 'Enter',

	// for mods:
	V = 'v',
	C = 'c',
	Z = 'z',
	Y = 'y',

	//Typing sys
	Plus = '+',
	ForwardSlash = '/',
	Star = '*',
	Minus = '-',
	GreaterThan = '>',
	LessThan = '<',
	Equals = '=',

	Escape = 'Escape',
	Space = ' ',

	//TODO: Remove later
	P = 'p'
}

export enum EditAction {
	Copy, // TODO: could use default or navigator.clipboard.writeText()
	Paste, // TODO: check navigator.clipboard.readText()

	Undo,
	Redo,

	MoveCursorLeft,
	MoveCursorRight,
	MoveCursorStart, // TODO
	MoveCursorEnd, // TODO

	DeleteNextChar,
	DeletePrevChar,

	DeleteToEnd,
	DeleteToStart,

	SelectLeft,
	SelectRight,
	SelectToStart, // TODO
	SelectToEnd, // TODO

	SelectNextToken,
	SelectPrevToken,
	SelectClosestTokenAbove,
	SelectClosestTokenBelow,

	InsertEmptyLine,

	DeleteNextToken,
	DeletePrevToken,

	InsertChar,

	None,

	//typing actions
	CompleteAddition,
	CompleteDivision,
	CompleteMultiplication,
	CompleteSubtraction,

	CompleteIntLiteral,
	CompleteStringLiteral,
	CompleteBoolLiteral,

	//displaying suggestion menu
	DisplayGreaterThanSuggestion,
	DisplayLessThanSuggestion,
	DisplayEqualsSuggestion,

	//suggestion management
	SelectMenuSuggestionBelow,
	SelectMenuSuggestionAbove,
	SelectMenuSuggestion,
	CloseValidInsertMenu,
	OpenValidInsertMenu,
	OpenSubMenu,
	CloseSubMenu,

	//TODO: Remove later
	OpenValidInsertMenuSingleLevel
}

export class EventHandler {
	module: ast.Module;

	constructor(module: ast.Module) {
		this.module = module;
	}

	setFocusedNode(code: ast.CodeConstruct) {
		this.module.focusedNode.notify(ast.CallbackType.loseFocus);

		this.module.focusedNode = code;
		this.module.editor.focusSelection(this.module.focusedNode.getSelection());

		code.notify(ast.CallbackType.focus);
	}

	getKeyAction(e: KeyboardEvent) {
		let curPos = this.module.editor.monaco.getPosition();

		if (this.module.focusedNode == null) {
			this.module.focusedNode = this.module.locateStatementAtLine(curPos.lineNumber);
		}
		let inTextEditMode = this.module.focusedNode.isTextEditable;

		switch (e.key) {
			case KeyPress.ArrowUp:
				if (this.module.menuController.isMenuOpen()) {
					return EditAction.SelectMenuSuggestionAbove;
				}
				return EditAction.SelectClosestTokenAbove;

			case KeyPress.ArrowDown:
				if (this.module.menuController.isMenuOpen()) {
					return EditAction.SelectMenuSuggestionBelow;
				}
				return EditAction.SelectClosestTokenBelow;

			case KeyPress.ArrowLeft:
				if (!inTextEditMode && this.module.menuController.isMenuOpen()) {
					return EditAction.CloseSubMenu;
				}

				if (inTextEditMode) {
					if (curPos.column == (this.module.focusedNode as ast.Token).left) return EditAction.SelectPrevToken;

					if (e.shiftKey && e.ctrlKey) return EditAction.SelectToStart;
					else if (e.shiftKey) return EditAction.SelectLeft;
					else if (e.ctrlKey) return EditAction.MoveCursorStart;
					else return EditAction.MoveCursorLeft;
				} else return EditAction.SelectPrevToken;

			case KeyPress.ArrowRight:
				if (!inTextEditMode && this.module.menuController.isMenuOpen()) {
					return EditAction.OpenSubMenu;
				}

				if (inTextEditMode) {
					if (
						curPos.column == (this.module.focusedNode as ast.Token).right + 1 ||
						(this.module.focusedNode as ast.Token).text == '---'
					)
						return EditAction.SelectNextToken;

					if (e.shiftKey && e.ctrlKey) return EditAction.SelectToEnd;
					else if (e.shiftKey) return EditAction.SelectRight;
					else if (e.ctrlKey) return EditAction.MoveCursorEnd;
					else return EditAction.MoveCursorRight;
				} else return EditAction.SelectNextToken;

			case KeyPress.Home:
				if (inTextEditMode) {
					if (e.shiftKey) return EditAction.SelectToStart;
					else return EditAction.MoveCursorStart;
				}
				break;

			case KeyPress.End:
				if (inTextEditMode) {
					if (e.shiftKey) return EditAction.SelectToEnd;
					else return EditAction.MoveCursorEnd;
				}
				break;

			case KeyPress.Delete:
				if (inTextEditMode) {
					if (e.ctrlKey) return EditAction.DeleteToEnd;
					else return EditAction.DeleteNextChar;
				} else return EditAction.DeleteNextToken;

			case KeyPress.Backspace:
				if (inTextEditMode) {
					if (e.ctrlKey) return EditAction.DeleteToStart;
					else return EditAction.DeletePrevChar;
				} else return EditAction.DeletePrevToken;

			case KeyPress.Enter:
				if (this.module.menuController.isMenuOpen()) {
					return EditAction.SelectMenuSuggestion;
				}

				let curLine = this.module.locateStatement(curPos);
				let curSelection = this.module.editor.monaco.getSelection();

				let leftPosToCheck = 1;
				let parent = this.module.focusedNode.getParentStatement().rootNode;

				if (parent instanceof ast.Statement && parent.body.length > 0)
					// is inside the body of another statement
					leftPosToCheck = parent.left + TAB_SPACES;

				if (curSelection.startColumn == curSelection.endColumn)
					if (curPos.column == leftPosToCheck || curPos.column == curLine.right + 1)
						return EditAction.InsertEmptyLine;

				break;

			case KeyPress.Plus:
				if (!inTextEditMode && e.shiftKey && e.key.length == 1) {
					return EditAction.CompleteAddition;
				}
				break;
			case KeyPress.Star:
				if (!inTextEditMode && e.shiftKey && e.key.length == 1) {
					return EditAction.CompleteMultiplication;
				}
				break;
			case KeyPress.Minus:
				if (!inTextEditMode && e.key.length == 1) {
					return EditAction.CompleteSubtraction;
				}
				break;
			case KeyPress.ForwardSlash:
				if (!inTextEditMode && e.key.length == 1) {
					return EditAction.CompleteDivision;
				}
				break;

			case KeyPress.GreaterThan:
				if (!inTextEditMode && e.shiftKey && e.key.length == 1) {
					return EditAction.DisplayGreaterThanSuggestion;
				}
				break;

			case KeyPress.LessThan:
				if (!inTextEditMode && e.shiftKey && e.key.length == 1) {
					return EditAction.DisplayLessThanSuggestion;
				}
				break;

			case KeyPress.Escape:
				if (!inTextEditMode && this.module.menuController.isMenuOpen()) {
					return EditAction.CloseValidInsertMenu;
				}
				break;

			case KeyPress.Equals:
				if (!inTextEditMode && e.key.length == 1) {
					return EditAction.DisplayEqualsSuggestion;
				}
				break;

			case KeyPress.Space:
				if (!inTextEditMode && e.ctrlKey && e.key.length == 1) {
					return EditAction.OpenValidInsertMenu;
				}
				break;

			//TODO: Remove later
			case KeyPress.P:
				if (!inTextEditMode && e.ctrlKey && e.key.length == 1) {
					return EditAction.OpenValidInsertMenuSingleLevel;
				}
				break;

			default:
				if (inTextEditMode) {
					if (e.key.length == 1) {
						switch (e.key) {
							case KeyPress.C:
								if (e.ctrlKey) return EditAction.Copy;
								break;

							case KeyPress.V:
								if (e.ctrlKey) return EditAction.Paste;
								break;

							case KeyPress.Z:
								if (e.ctrlKey) return EditAction.Undo;
								break;

							case KeyPress.Y:
								if (e.ctrlKey) return EditAction.Redo;
								break;
						}

						return EditAction.InsertChar;
					}
				} else {
					if ([ '1', '2', '3', '4', '5', '6', '7', '8', '9', '0' ].indexOf(e.key) > -1) {
						return EditAction.CompleteIntLiteral;
					} else if ([ 't', 'f' ].indexOf(e.key) > -1) {
						return EditAction.CompleteBoolLiteral;
					} else if ([ '"' ].indexOf(e.key) > -1) {
						return EditAction.CompleteStringLiteral;
					}
					return EditAction.None;
				}
		}
	}

	onKeyDown(e) {
		let action = this.getKeyAction(e.browserEvent);
		const selection = this.module.focusedNode.getSelection();
		let suggestions = [];
		let suggestionMap = null;

		switch (action) {
			case EditAction.InsertEmptyLine: {
				this.module.insertEmptyLine();

				e.preventDefault();
				e.stopPropagation();
				break;
			}

			case EditAction.SelectPrevToken: {
				this.setFocusedNode(this.module.focusedNode.getPrevEditableToken());

				e.preventDefault();
				e.stopPropagation();
				break;
			}

			case EditAction.SelectNextToken: {
				this.setFocusedNode(this.module.focusedNode.getNextEditableToken());

				e.preventDefault();
				e.stopPropagation();
				break;
			}

			case EditAction.InsertChar: {
				let cursorPos = this.module.editor.monaco.getPosition();
				let selectedText = this.module.editor.monaco.getSelection();

				let token: ast.TextEditable;

				if (
					this.module.focusedNode instanceof ast.IdentifierTkn ||
					this.module.focusedNode instanceof ast.EditableTextTkn
				)
					token = this.module.focusedNode;
				else
					throw new Error(
						'Trying to insert-char at an incorrect token or with an incorrect isTextEditable value.'
					);

				let newText = '';

				if (token.getEditableText() == '---') {
					let curText = '';
					newText = curText + e.browserEvent.key;
				} else {
					let curText = token.getEditableText().split('');
					curText.splice(
						cursorPos.column - this.module.focusedNode.left,
						Math.abs(selectedText.startColumn - selectedText.endColumn),
						e.browserEvent.key
					);
					newText = curText.join('');
				}

				if (this.module.focusedNode instanceof ast.IdentifierTkn) {
					let newNotification = false;

					if (Object.keys(keywords.PythonKeywords).indexOf(newText) > -1) {
						this.module.notificationSystem.addHoverNotification(
							this.module.focusedNode,
							{ identifier: newText },
							ErrorMessage.identifierIsKeyword
						);
						newNotification = true;
					} else if (Object.keys(keywords.BuiltInFunctions).indexOf(newText) > -1) {
						this.module.notificationSystem.addHoverNotification(
							this.module.focusedNode,
							{ identifier: newText },
							ErrorMessage.identifierIsBuiltInFunc
						);
						newNotification = true;
					}

					if (!newNotification && this.module.focusedNode.notification) {
						this.module.notificationSystem.removeNotificationFromConstruct(this.module.focusedNode);
					}
				}

				// TODO: check if turns back into an empty hole

				if (token.setEditedText(newText)) {
					let editRange = new monaco.Range(
						cursorPos.lineNumber,
						cursorPos.column,
						cursorPos.lineNumber,
						cursorPos.column
					);

					if (selectedText.startColumn != selectedText.endColumn) {
						editRange = new monaco.Range(
							cursorPos.lineNumber,
							selectedText.startColumn,
							cursorPos.lineNumber,
							selectedText.endColumn
						);
					}

					this.module.editor.executeEdits(editRange, null, e.browserEvent.key);
				}

				e.preventDefault();
				e.stopPropagation();

				break;
			}

			case EditAction.DeletePrevChar:
			case EditAction.DeleteNextChar: {
				let cursorPos = this.module.editor.monaco.getPosition();
				let selectedText = this.module.editor.monaco.getSelection();

				let token: ast.TextEditable;

				if (
					this.module.focusedNode instanceof ast.IdentifierTkn ||
					this.module.focusedNode instanceof ast.EditableTextTkn
				)
					token = this.module.focusedNode;
				else
					throw new Error(
						'Trying to insert-char at an incorrect token or with an incorrect isTextEditable value.'
					);

				let newText = '';

				// TODO: if it is equal to --- => just prevent default

				let curText = token.getEditableText().split('');
				let toDeleteItems =
					selectedText.startColumn == selectedText.endColumn
						? 1
						: Math.abs(selectedText.startColumn - selectedText.endColumn);

				let toDeletePos = action == EditAction.DeleteNextChar ? 0 : 1;

				curText.splice(
					Math.min(
						cursorPos.column - this.module.focusedNode.left - toDeletePos,
						selectedText.startColumn - this.module.focusedNode.left - toDeletePos
					),
					toDeleteItems
				);

				newText = curText.join('');

				if (this.module.focusedNode instanceof ast.IdentifierTkn) {
					let newNotification = false;

					if (Object.keys(keywords.PythonKeywords).indexOf(newText) > -1) {
						this.module.notificationSystem.addHoverNotification(
							this.module.focusedNode,
							{ identifier: newText },
							ErrorMessage.identifierIsKeyword
						);
						newNotification = true;
					} else if (Object.keys(keywords.BuiltInFunctions).indexOf(newText) > -1) {
						this.module.notificationSystem.addHoverNotification(
							this.module.focusedNode,
							{ identifier: newText },
							ErrorMessage.identifierIsBuiltInFunc
						);
						newNotification = true;
					}

					if (!newNotification && this.module.focusedNode.notification) {
						this.module.notificationSystem.removeNotificationFromConstruct(this.module.focusedNode);
					}
				}

				// TODO: check if turns back into an empty hole

				if (token.setEditedText(newText)) {
					let editRange = new monaco.Range(
						cursorPos.lineNumber,
						cursorPos.column,
						cursorPos.lineNumber,
						cursorPos.column
					);

					if (selectedText.startColumn != selectedText.endColumn) {
						editRange = new monaco.Range(
							cursorPos.lineNumber,
							selectedText.startColumn,
							cursorPos.lineNumber,
							selectedText.endColumn - 1
						);
					}

					this.module.editor.executeEdits(editRange, null, '');
				} else {
					e.stopPropagation();
					e.preventDefault();
				}

				break;
			}

			case EditAction.SelectClosestTokenAbove: {
				let curPos = this.module.editor.monaco.getPosition();
				let parentStmt = this.module.focusedNode.getParentStatement();
				let aboveStmt = this.module.locateStatementAtLine(curPos.lineNumber - 1);

				if (aboveStmt != null) {
					if (curPos.column >= aboveStmt.right) {
						// go to the end of above stmt
						if (aboveStmt instanceof ast.EmptyLineStmt) this.setFocusedNode(aboveStmt);
						else this.setFocusedNode(aboveStmt.getEndOfLineToken());
					} else {
						let aboveNode = aboveStmt.locate(new monaco.Position(curPos.lineNumber - 1, curPos.column));
						this.setFocusedNode(aboveNode);
					}
				} else this.setFocusedNode(parentStmt.getStartOfLineToken());

				e.stopPropagation();
				e.preventDefault();

				break;
			}

			case EditAction.SelectClosestTokenBelow: {
				let curPos = this.module.editor.monaco.getPosition();
				let parentStmt = this.module.focusedNode.getParentStatement();
				let belowStmt = this.module.locateStatementAtLine(curPos.lineNumber + 1);

				if (belowStmt != null) {
					if (curPos.column >= belowStmt.right) {
						// go to the end of below stmt
						if (belowStmt instanceof ast.EmptyLineStmt) this.setFocusedNode(belowStmt);
						else this.setFocusedNode(belowStmt.getEndOfLineToken());
					} else {
						let aboveNode = belowStmt.locate(new monaco.Position(curPos.lineNumber + 1, curPos.column));
						this.setFocusedNode(aboveNode);
					}
				} else this.setFocusedNode(parentStmt.getEndOfLineToken());

				e.stopPropagation();
				e.preventDefault();

				break;
			}

			case EditAction.MoveCursorLeft:
				// this.module.focusedNode = this.locate(this.module.editor.getPosition());

				break;

			case EditAction.MoveCursorRight:
				// this.module.focusedNode = this.locate(this.module.editor.getPosition());

				break;

			case EditAction.SelectLeft:
				break;

			case EditAction.SelectRight:
				break;

			case EditAction.SelectToStart:
				break;

			case EditAction.SelectToEnd:
				break;

			case EditAction.Copy:
				break;

			case EditAction.CompleteAddition:
				this.module.constructCompleter.completeArithmeticConstruct(BinaryOperator.Add);

				e.preventDefault();
				e.stopPropagation();
				break;

			case EditAction.CompleteSubtraction:
				this.module.constructCompleter.completeArithmeticConstruct(BinaryOperator.Subtract);

				e.preventDefault();
				e.stopPropagation();
				break;

			case EditAction.CompleteDivision:
				this.module.constructCompleter.completeArithmeticConstruct(BinaryOperator.Divide);

				e.preventDefault();
				e.stopPropagation();
				break;

			case EditAction.CompleteMultiplication:
				console.log(this.module.editor.holes);
				console.log(e);

				this.module.constructCompleter.completeArithmeticConstruct(BinaryOperator.Multiply);

				e.preventDefault();
				e.stopPropagation();
				break;

			case EditAction.CompleteIntLiteral:
				this.module.constructCompleter.completeLiteralConstruct(DataType.Number);

				e.preventDefault();
				e.stopPropagation();
				break;

			case EditAction.CompleteStringLiteral:
				this.module.constructCompleter.completeLiteralConstruct(DataType.String);

				e.preventDefault();
				e.stopPropagation();
				break;

			case EditAction.CompleteBoolLiteral:
				this.module.constructCompleter.completeBoolLiteralConstruct(e.browserEvent.key === 't' ? 1 : 0);

				e.preventDefault();
				e.stopPropagation();
				break;

			case EditAction.DisplayGreaterThanSuggestion:
				suggestions = [ ConstructKeys.GreaterThan, ConstructKeys.GreaterThanOrEqual ];
				suggestions = this.module.getValidInsertsFromSet(this.module.focusedNode, suggestions);
				this.module.menuController.buildSingleLevelMenu(
					suggestions,
					Util.getInstance(this.module).constructActions,
					{
						left: selection.startColumn * this.module.editor.computeCharWidth(),
						top: selection.startLineNumber * this.module.editor.computeCharHeight()
					}
				);

				e.preventDefault();
				e.stopPropagation();
				break;

			case EditAction.DisplayLessThanSuggestion:
				suggestions = [ ConstructKeys.LessThan, ConstructKeys.LessThanOrEqual ];
				suggestions = this.module.getValidInsertsFromSet(this.module.focusedNode, suggestions);

				this.module.menuController.buildSingleLevelMenu(
					suggestions,
					Util.getInstance(this.module).constructActions,
					{
						left: selection.startColumn * this.module.editor.computeCharWidth(),
						top: selection.startLineNumber * this.module.editor.computeCharHeight()
					}
				);

				e.preventDefault();
				e.stopPropagation();
				break;

			case EditAction.DisplayEqualsSuggestion:
				suggestions = [ ConstructKeys.Equals, ConstructKeys.NotEquals, ConstructKeys.VariableAssignment ];
				suggestions = this.module.getValidInsertsFromSet(this.module.focusedNode, suggestions);

				this.module.menuController.buildSingleLevelMenu(
					suggestions,
					Util.getInstance(this.module).constructActions,
					{
						left: selection.startColumn * this.module.editor.computeCharWidth(),
						top: selection.startLineNumber * this.module.editor.computeCharHeight()
					}
				);

				e.preventDefault();
				e.stopPropagation();
				break;

			case EditAction.OpenValidInsertMenu:
				if (!this.module.menuController.isMenuOpen()) {
					this.module.menuController.buildAvailableInsertsMenu(
						this.module.getAllValidInsertsList(this.module.focusedNode),
						Util.getInstance(this.module).constructActions,
						{
							left: selection.startColumn * this.module.editor.computeCharWidth(),
							top: selection.startLineNumber * this.module.editor.computeCharHeight()
						}
					);
				} else {
					this.module.menuController.removeMenus();
				}

				e.preventDefault();
				e.stopPropagation();
				break;

			//TODO: Remove later
			case EditAction.OpenValidInsertMenuSingleLevel:
				if (!this.module.menuController.isMenuOpen()) {
					const suggestions = this.module.getAllValidInsertsList(this.module.focusedNode);
					this.module.menuController.buildSingleLevelConstructCategoryMenu(suggestions);
				} else {
					this.module.menuController.removeMenus();
				}

				e.preventDefault();
				e.stopPropagation();
				break;

			case EditAction.SelectMenuSuggestionAbove:
				this.module.menuController.focusOptionAbove();
				e.stopPropagation();
				e.preventDefault();
				break;

			case EditAction.SelectMenuSuggestionBelow:
				this.module.menuController.focusOptionBelow();
				e.stopPropagation();
				e.preventDefault();
				break;

			case EditAction.SelectMenuSuggestion:
				this.module.menuController.selectFocusedOption();
				e.stopPropagation();
				e.preventDefault();
				break;

			case EditAction.CloseValidInsertMenu:
				this.module.menuController.removeMenus();
				e.stopPropagation();
				e.preventDefault();
				break;

			case EditAction.OpenSubMenu:
				this.module.menuController.openSubMenu();
				e.stopPropagation();
				e.preventDefault();
				break;

			case EditAction.CloseSubMenu:
				this.module.menuController.closeSubMenu();
				e.stopPropagation();
				e.preventDefault();
				break;

			default:
				e.preventDefault();
				e.stopPropagation();
		}
	}

	onMouseDown(e) {
		this.setFocusedNode(this.module.locateStatement(e.target.position).locate(e.target.position));
	}

	onButtonDown(id: string) {
		switch (id) {
			case 'add-var-btn':
				if (!(document.getElementById('add-var-btn') as HTMLButtonElement).disabled) {
					this.module.insert(new AST.VarAssignmentStmt());
				}
				break;
			case 'add-print-btn':
				this.module.insert(
					new AST.FunctionCallStmt(
						'print',
						[ new AST.Argument(AST.DataType.Any, 'item', false) ],
						AST.DataType.Void
					)
				);
				break;
			case 'add-randint-btn':
				this.module.insert(
					new AST.FunctionCallStmt(
						'randint',
						[
							new AST.Argument(AST.DataType.Number, 'start', false),
							new AST.Argument(AST.DataType.Number, 'end', false)
						],
						AST.DataType.Number
					)
				);
				break;
			case 'add-range-btn':
				this.module.insert(
					new AST.FunctionCallStmt(
						'range',
						[
							new AST.Argument(AST.DataType.Number, 'start', false),
							new AST.Argument(AST.DataType.Number, 'end', false)
						],
						AST.DataType.List
					)
				);
				break;

			case 'add-len-btn':
				this.module.insert(
					new AST.FunctionCallStmt(
						'len',
						[ new AST.Argument(AST.DataType.List, 'list', false) ],
						AST.DataType.Number
					)
				);
				break;

			case 'add-str-btn':
				this.module.insert(new AST.LiteralValExpr(AST.DataType.String));
				break;

			case 'add-num-btn':
				this.module.insert(new AST.LiteralValExpr(AST.DataType.Number));
				break;

			case 'add-true-btn':
				this.module.insert(new AST.LiteralValExpr(AST.DataType.Boolean, 'True'));
				break;

			case 'add-false-btn':
				this.module.insert(new AST.LiteralValExpr(AST.DataType.Boolean, 'False'));
				break;

			case 'add-bin-add-expr-btn':
				this.module.insert(new AST.BinaryOperatorExpr(AST.BinaryOperator.Add, AST.DataType.Any));
				break;

			case 'add-bin-sub-expr-btn':
				this.module.insert(new AST.BinaryOperatorExpr(AST.BinaryOperator.Subtract, AST.DataType.Any));
				break;

			case 'add-bin-mul-expr-btn':
				this.module.insert(new AST.BinaryOperatorExpr(AST.BinaryOperator.Multiply, AST.DataType.Any));
				break;

			case 'add-bin-div-expr-btn':
				this.module.insert(new AST.BinaryOperatorExpr(AST.BinaryOperator.Divide, AST.DataType.Any));
				break;

			case 'add-bin-and-expr-btn':
				this.module.insert(new AST.BinaryBoolOperatorExpr(AST.BoolOperator.And));
				break;

			case 'add-bin-or-expr-btn':
				this.module.insert(new AST.BinaryBoolOperatorExpr(AST.BoolOperator.Or));
				break;

			case 'add-unary-not-expr-btn':
				this.module.insert(
					new AST.UnaryOperatorExpr(AST.UnaryOp.Not, AST.DataType.Boolean, AST.DataType.Boolean)
				);
				break;

			case 'add-comp-eq-expr-btn':
				this.module.insert(new AST.ComparatorExpr(AST.ComparatorOp.Equal));
				break;

			case 'add-comp-neq-expr-btn':
				this.module.insert(new AST.ComparatorExpr(AST.ComparatorOp.NotEqual));
				break;

			case 'add-comp-lt-expr-btn':
				this.module.insert(new AST.ComparatorExpr(AST.ComparatorOp.LessThan));
				break;

			case 'add-comp-lte-expr-btn':
				this.module.insert(new AST.ComparatorExpr(AST.ComparatorOp.LessThanEqual));
				break;

			case 'add-comp-gt-expr-btn':
				this.module.insert(new AST.ComparatorExpr(AST.ComparatorOp.GreaterThan));
				break;

			case 'add-comp-gte-expr-btn':
				this.module.insert(new AST.ComparatorExpr(AST.ComparatorOp.GreaterThanEqual));
				break;

			case 'add-while-expr-btn':
				this.module.insert(new AST.WhileStatement());
				break;

			case 'add-if-expr-btn':
				this.module.insert(new AST.IfStatement());
				break;

			case 'add-elif-expr-btn':
				this.module.insert(new AST.ElseStatement(true));
				break;

			case 'add-else-expr-btn':
				this.module.insert(new AST.ElseStatement(false));
				break;

			case 'add-for-expr-btn':
				this.module.insert(new AST.ForStatement());
				break;

			case 'add-list-literal-btn':
				this.module.insert(new AST.ListLiteralExpression());
				break;

			case 'add-list-item-btn':
				this.module.insertListItem();
				break;

			case 'add-list-append-stmt-btn':
				this.module.insert(
					new AST.MethodCallStmt('append', [ new AST.Argument(AST.DataType.Any, 'object', false) ])
				);
				break;

			case 'add-list-index-btn':
				this.module.insert(new AST.MemberCallStmt(AST.DataType.Any));
				break;

			case 'add-test-array':
				let varAssignStmt = new AST.VarAssignmentStmt('arr');
				let listExpr = new AST.ListLiteralExpression();
				listExpr.insertListItem(1, 30);
				listExpr.insertListItem(1, 60);
				listExpr.insertListItem(1, 80);
				listExpr.insertListItem(1, 20);
				listExpr.insertListItem(1, 50);
				listExpr.insertListItem(1, 100);
				listExpr.insertListItem(1, 10);
				listExpr.insertListItem(1, 70);
				listExpr.insertListItem(1, 90);
				listExpr.insertListItem(1, 40);

				varAssignStmt.replaceValue(listExpr);

				this.module.addVariableButtonToToolbox(varAssignStmt);
				this.module.scope.references.push(new AST.Reference(varAssignStmt, this.module.scope));
				varAssignStmt.updateButton();

				this.module.insert(varAssignStmt);

				break;

			case 'add-split-method-call-btn':
				this.module.insert(
					new AST.MethodCallExpr(
						'split',
						[ new AST.Argument(AST.DataType.String, 'sep', false) ],
						AST.DataType.List,
						AST.DataType.String
					)
				);
				break;

			case 'add-join-method-call-btn':
				this.module.insert(
					new AST.MethodCallExpr(
						'join',
						[ new AST.Argument(AST.DataType.List, 'items', false) ],
						AST.DataType.String,
						AST.DataType.String
					)
				);
				break;

			case 'add-replace-method-call-btn':
				this.module.insert(
					new AST.MethodCallExpr(
						'replace',
						[
							new AST.Argument(AST.DataType.String, 'old', false),
							new AST.Argument(AST.DataType.String, 'new', false)
						],
						AST.DataType.String,
						AST.DataType.String
					)
				);
				break;

			case 'add-find-method-call-btn':
				this.module.insert(
					new AST.MethodCallExpr(
						'find',
						[ new AST.Argument(AST.DataType.String, 'item', false) ],
						AST.DataType.Number,
						AST.DataType.String
					)
				);
				break;

			case 'add-list-elem-assign-btn':
				this.module.insert(new AST.ListElementAssignment());
				break;

			default:
		}
	}

	onMouseMove(e) {
		this.module.editor.mousePosMonaco = e.target.position;
	}

	onDidScrollChange(e) {
		this.module.editor.scrollOffsetTop = e.scrollTop;
	}
}
