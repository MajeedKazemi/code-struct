import * as monaco from 'monaco-editor';
import { getEditor } from './editor';
import { CodeConstruct } from '../helpers/code-construct';
import * as python from '../syntax-tree/python-syntax-tree';

function insertAtCursor(construct: CodeConstruct) {
	var line = getEditor().getPosition();
	var id = { major: 1, minor: 1 };
	var op = { identifier: id, range: getEditor().getSelection(), text: construct.code, forceMoveMarkers: true };

	getEditor().executeEdits('my-source', [ op ]);

	// TODO: add it to the syntax tree (similar to getEditor)

	getEditor().focus();
	getEditor().setPosition({
		lineNumber: line.lineNumber + construct.initialCursorDiff.lineNumber,
		column: line.column + construct.initialCursorDiff.column
	});
	getEditor().setSelection({
		startLineNumber: line.lineNumber,
		endLineNumber: line.lineNumber,
		startColumn: line.column + construct.initialCursorDiff.column,
		endColumn: line.column + construct.initialCursorDiff.column + construct.selectionChars
	});
}

function initToolbox() {
	// FIXME: it doesn't add another tab for the next line if it's currently within a tabbed body

	const printStmt = new CodeConstruct('print()', new python.CallFunctionExpr('print'), new monaco.Position(0, 6), 0);
	const varAssignStmt = new CodeConstruct('--- = ---', new python.VarAssignStmt(), new monaco.Position(0, 0), 3);
	const whileStmt = new CodeConstruct('while --- :\n\t---', new python.WhileStmt(), new monaco.Position(0, 6), 3);
	const ifStmt = new CodeConstruct('if --- :\n\t---', new python.IfStmt(), new monaco.Position(0, 3), 3);
	const functionDefStmt = new CodeConstruct(
		'def --- ():\n\t---',
		new python.FunctionDefStmt(),
		new monaco.Position(0, 4),
		3
	);
	const forStmt = new CodeConstruct('for --- in --- :\n\t---', new python.ForStmt(), new monaco.Position(0, 4), 3);

	document.getElementById('add-print-btn').addEventListener('click', (e) => insertAtCursor(printStmt));
	document.getElementById('add-var-btn').addEventListener('click', (e) => insertAtCursor(varAssignStmt));
	document.getElementById('add-while-loop-btn').addEventListener('click', (e) => insertAtCursor(whileStmt));
	document.getElementById('add-if-btn').addEventListener('click', (e) => insertAtCursor(ifStmt));
	document.getElementById('add-fun-btn').addEventListener('click', (e) => insertAtCursor(functionDefStmt));
	document.getElementById('add-for-loop-btn').addEventListener('click', (e) => insertAtCursor(forStmt));
}

export { initToolbox };
