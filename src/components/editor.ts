import * as monaco from 'monaco-editor';
import { SyntaxTreeManager } from '../syntax-tree/syntax-tree-manager';

var initialized = false;
var editor: monaco.editor.IStandaloneCodeEditor;
var ast: SyntaxTreeManager;

function initEditor() {
	if (!initialized) {
		editor = monaco.editor.create(document.getElementById('editor'), {
			value: '',
			language: 'python',
			minimap: { enabled: false }
		});
		ast = new SyntaxTreeManager();

		initialized = true;
	}
}

function getEditor() {
	if (!initialized) initEditor();

	return editor;
}

function getSyntaxTree() {
	if (!initialized) initEditor();

	return ast;
}

export { initEditor, getEditor, getSyntaxTree };
