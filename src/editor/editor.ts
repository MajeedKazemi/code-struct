import * as monaco from 'monaco-editor';
import { CodeConstruct, EditableTextTkn, EmptyExpr, IdentifierTkn, Statement, TypedEmptyExpr } from '../syntax-tree/ast';
import Cursor from './cursor';
import Hole from './hole';

export default class Editor {

    monaco: monaco.editor.IStandaloneCodeEditor;
    cursor: Cursor;
    holes: any[];

    constructor(parentEl: HTMLElement) {
        this.monaco = monaco.editor.create(parentEl, {
			value: "",
            language: "python",
            minimap: {
                enabled: false,
            },
            overviewRulerLanes: 0,
            scrollbar: {
                vertical: "hidden",
            },
            overviewRulerBorder: false,
            fontSize: 20,
            contextmenu: false,
            mouseWheelScrollSensitivity: 0,
            lineHeight: 40,
            selectOnLineNumbers: false,
            letterSpacing: -0.5,
            codeLens: false,
            dragAndDrop: false,
            quickSuggestions: {
                other: false,
                comments: false,
                strings: false,
            },
            parameterHints: {
                enabled: false,
            },
            suggestOnTriggerCharacters: false,
            acceptSuggestionOnEnter: "off",
            tabCompletion: "off",
            wordBasedSuggestions: false,
		});

		// Visual
		this.cursor = new Cursor(this);
        this.holes = [];
    }

    focusSelection(selection: monaco.Selection) {
        this.monaco.setPosition(new monaco.Position(selection.startLineNumber, selection.startColumn));
		this.cursor.setSelection(selection);
    }

    getLineEl(ln: number) {
        const lines = document.body.getElementsByClassName("view-lines")[0];
        const line = lines.children[ln - 1];
        return <HTMLElement> line?.children[0];
    }

    computeCharWidth(ln = 1) {
        let line = this.getLineEl(ln);
        return line.getBoundingClientRect().width / line.innerText.length;
    }

    addHoles(code: CodeConstruct) {
        if (code instanceof EditableTextTkn || code instanceof TypedEmptyExpr || code instanceof EmptyExpr || code instanceof IdentifierTkn) {
            this.holes.push(new Hole(this, code));
        } else if (code instanceof Statement) {
            const statement = <Statement> code;
            statement.tokens.forEach(token => this.addHoles(token));
        }
    }
    
    executeEdits(range: monaco.Range, code: CodeConstruct) {
        this.monaco.executeEdits('module', [
            { range: range, text: code.getRenderText(), forceMoveMarkers: true }
        ]);

        this.addHoles(code);
    }

    computeBoundingBox(selection: monaco.Selection) {
        // Get entire line bbox
        let bbox = this.getLineEl(selection.startLineNumber).getBoundingClientRect();
        let charWidth = this.computeCharWidth();

        // Set x,y based on column
        bbox.x += (selection.startColumn - 1) * charWidth;
        bbox.width = (selection.endColumn - selection.startColumn) * charWidth

        // Add vertical padding
        bbox.y -= 5;
        bbox.height += 10;

        return bbox;
    }
}