import * as ast from '../syntax-tree/ast';
import * as monaco from 'monaco-editor';
import { TAB_SPACES } from '../syntax-tree/keywords';

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
	Y = 'y'
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

	None
}

export class EventHandler {
	module: ast.Module;

	constructor(module: ast.Module) {
		this.module = module;

		this.attachOnMouseDownListener();
		this.attachOnKeyDownListener();
	}

	setFocusedNode(code: ast.CodeConstruct) {
		this.module.focusedNode = code;
		this.module.editor.focusSelection(this.module.focusedNode.getSelection());
	}

	getKeyAction(e: KeyboardEvent) {
		let curPos = this.module.editor.monaco.getPosition();
		// if (this.module.focusedNode == null)
		// 	this.module.focusedNode = this.locate(curPos);

		let inTextEditMode = this.module.focusedNode.isTextEditable;

		switch (e.key) {
			case KeyPress.ArrowUp:
				return EditAction.SelectClosestTokenAbove;

			case KeyPress.ArrowDown:
				return EditAction.SelectClosestTokenBelow;

			case KeyPress.ArrowLeft:
				if (inTextEditMode) {
					if (curPos.column == (this.module.focusedNode as ast.Token).left) return EditAction.SelectPrevToken;

					if (e.shiftKey && e.ctrlKey) return EditAction.SelectToStart;
					else if (e.shiftKey) return EditAction.SelectLeft;
					else if (e.ctrlKey) return EditAction.MoveCursorStart;
					else return EditAction.MoveCursorLeft;
				} else return EditAction.SelectPrevToken;

			case KeyPress.ArrowRight:
				if (inTextEditMode) {
					if (curPos.column == (this.module.focusedNode as ast.Token).right + 1)
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
				} else return EditAction.None;
		}
	}

	attachOnKeyDownListener() {
		this.module.editor.monaco.onDidPaste((e) => {
			// TODO: if in edit-mode: check if it is a valid edit and then paste it o.w. prevent it
		});

		this.module.editor.monaco.onKeyDown((e) => {
			let action = this.getKeyAction(e.browserEvent);

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

						this.module.editor.monaco.executeEdits('module', [
							{ range: editRange, text: e.browserEvent.key, forceMoveMarkers: true }
						]);
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

						this.module.editor.monaco.executeEdits('module', [
							{ range: editRange, text: '', forceMoveMarkers: true }
						]);
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

				default:
					e.preventDefault();
					e.stopPropagation();
			}
		});
	}

	attachOnMouseDownListener() {
		this.module.editor.monaco.onMouseDown((e) => {
			// if (this.editingIdentifier) {
			//     // if inside the editing identifier's edit text => update editIndex
			//     // else -> exit editMode
			// } else

			for (let line of this.module.body) {
				if (line.contains(e.target.position)) {
					this.setFocusedNode(line.locate(e.target.position));

					return;
				}
			}

			throw new Error('The clicked position did not match any of the statements in the module.');
		});
	}
}
