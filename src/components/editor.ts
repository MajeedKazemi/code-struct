import * as monaco from 'monaco-editor';

var initialized = false;
var editor: monaco.editor.IStandaloneCodeEditor;

function initEditor() {
	if (!initialized) {
		editor = monaco.editor.create(document.getElementById('editor'), {
			value: '',
			language: 'python',
			minimap: { enabled: false }
		});

		initialized = true;
	}
}

function getEditor() {
	if (!initialized) initEditor();

	return editor;
}

export { initEditor, getEditor };
