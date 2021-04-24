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

    focusSelection(selection: monaco.Selection, code: CodeConstruct = null) {
        if (selection.startColumn == selection.endColumn) {
            this.monaco.setPosition(new monaco.Position(selection.startLineNumber, selection.startColumn));
        } else {
            this.cursor.setSelection(selection, code);
            this.monaco.setSelection(selection);
        }
    }

    getLineEl(ln: number) {
        const lines = document.body.getElementsByClassName("view-lines")[0];
        const line = lines.children[ln - 1];
        return <HTMLElement> line?.children[0];
    }

    addHoles(code: CodeConstruct) {
        if (code instanceof EditableTextTkn || code instanceof TypedEmptyExpr || code instanceof EmptyExpr || code instanceof IdentifierTkn) {
            this.holes.push(new Hole(this, code));
        } else if (code instanceof Statement) {
            const statement = <Statement> code;
            statement.tokens.forEach(token => this.addHoles(token));
        }
    }
    
    executeEdits(range: monaco.Range, code: CodeConstruct, overwrite: string = null) {

        let text = overwrite || code.getRenderText();

        this.monaco.executeEdits('module', [
            { range: range, text, forceMoveMarkers: true }
        ]);

        this.addHoles(code);
    }

    // computeCharSize(ln = 1) {
    //     const lines = document.body.getElementsByClassName("view-lines")[0];

    //     const temp = document.createElement("span");
    //     temp.innerText = 'CALC_WIDTH';
    //     lines.append(temp);

    //     let {width, height} = temp.getBoundingClientRect();
    //     width /= temp.innerText.length

    //     temp.remove();

    //     return {width, height};
    // }

    // computeBoundingBox(selection: monaco.Selection) {
    //     // Get entire line bbox
    //     let {x, y} = this.getLineEl(selection.startLineNumber).getBoundingClientRect();
    //     // y = Math.max(71.77, y);
    //     let {width, height} = this.computeCharSize();

    //     // Set x,y based on column
    //     x += (selection.startColumn - 1) * width;
    //     width = (selection.endColumn - selection.startColumn) * width;

    //     // Add vertical padding
    //     // y -= 5;
    //     // height += 10;

    //     return {x, y, width, height};
    // }

    computeBoundingBox(selection: monaco.Selection) {
        const lines = document.getElementsByClassName("view-lines")[0];
        const line = lines.children[selection.startLineNumber - 1];
        const bbox = line?.children[0]?.getBoundingClientRect();
        if (bbox == null) return {x: 0, y: 0, width: 0, height: 0};

        bbox.x += this.computeCharWidth() * (selection.startColumn - 1);
        bbox.width = this.computeCharWidth() * (selection.endColumn - selection.startColumn);

        return bbox;
    }

    computeCharWidth(ln = 1) {
        const lines = document.getElementsByClassName("view-lines")[0];

        let line = <HTMLElement> lines.children[ln - 1]?.children[0];
        if (line == null) return 0;

        return line.getBoundingClientRect().width / line.innerText.length;
    }
}