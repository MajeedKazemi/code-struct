import { Hole } from "./hole";
import { Cursor } from "./cursor";
import * as monaco from "monaco-editor";
import { Module } from "../syntax-tree/module";
import { TAB_SPACES } from "../syntax-tree/consts";
import { CodeConstruct, EditableTextTkn, IdentifierTkn, Statement, TypedEmptyExpr } from "../syntax-tree/ast";

export class Editor {
    module: Module;
    cursor: Cursor;
    monaco: monaco.editor.IStandaloneCodeEditor;
    holes: Hole[];
    mousePosMonaco: monaco.Position;
    mousePosWindow: number[] = [0, 0];
    scrollOffsetTop: number = 0;

    constructor(parentEl: HTMLElement, module: Module) {
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

        this.cursor = new Cursor(this);
        this.holes = [];
        this.module = module;
    }

    focusSelection() {
        // if (selection.startColumn == selection.endColumn) {
        //     this.monaco.setPosition(new monaco.Position(selection.startLineNumber, selection.startColumn));
        // } else {
        //     this.cursor.setSelection(selection, code);
        //     this.monaco.setSelection(selection);
        // }
        const context = this.module.focus.getContext();
    }

    getLineEl(ln: number) {
        const lines = document.body.getElementsByClassName("view-lines")[0];
        const line = lines.children[ln - 1];

        return <HTMLElement>line?.children[0];
    }

    addHoles(code: CodeConstruct) {
        for (const hole of this.holes) if (hole.code == code) return;

        if (code instanceof EditableTextTkn || code instanceof TypedEmptyExpr || code instanceof IdentifierTkn) {
            this.holes.push(new Hole(this, code));
        } else if (code instanceof Statement) {
            const statement = <Statement>code;
            statement.tokens.forEach((token) => this.addHoles(token));
        }
    }

    executeEdits(range: monaco.Range, code: CodeConstruct, overwrite: string = null) {
        let text = overwrite;

        if (overwrite == null) text = code.getRenderText();

        this.monaco.executeEdits("module", [{ range: range, text, forceMoveMarkers: true }]);

        this.addHoles(code);
        this.monaco.focus();
    }

    indentRecursively(statement: Statement, { backward = false }) {
        this.module.editor.executeEdits(
            new monaco.Range(
                statement.lineNumber,
                statement.left,
                statement.lineNumber,
                statement.left - (backward ? TAB_SPACES : 0)
            ),
            null,
            backward ? "" : "    "
        );

        if (statement.hasBody()) {
            const stmtStack = new Array<Statement>();

            stmtStack.unshift(...statement.body);

            while (stmtStack.length > 0) {
                const curStmt = stmtStack.pop();

                this.module.editor.executeEdits(
                    new monaco.Range(
                        curStmt.lineNumber,
                        curStmt.left,
                        curStmt.lineNumber,
                        curStmt.left - (backward ? TAB_SPACES : 0)
                    ),
                    null,
                    backward ? "" : "    "
                );

                if (curStmt.hasBody()) stmtStack.unshift(...curStmt.body);
            }
        }
    }

    insertAtCurPos(codeList: Array<CodeConstruct>) {
        const curPos = this.monaco.getPosition();
        let text = "";

        for (const code of codeList) text += code.getRenderText();

        const range = new monaco.Range(curPos.lineNumber, curPos.column, curPos.lineNumber, curPos.column);

        this.monaco.executeEdits("module", [{ range: range, text, forceMoveMarkers: true }]);

        for (const code of codeList) this.addHoles(code);
    }

    computeBoundingBox(selection: monaco.Selection) {
        const x = this.monaco.getOffsetForColumn(selection.startLineNumber, selection.startColumn);
        const y = this.monaco.getTopForLineNumber(selection.startLineNumber);

        const width = this.monaco.getOffsetForColumn(selection.startLineNumber, selection.endColumn) - x;
        const height = this.computeCharHeight();

        return { x, y, width, height };
    }

    computeCharHeight() {
        const lines = document.getElementsByClassName("view-lines")[0];
        const line = lines.children[0];
        const boundingBox = line?.getBoundingClientRect();

        return boundingBox?.height || 0;
    }

    computeCharWidth(ln = 1) {
        const lines = document.getElementsByClassName("view-lines")[0];

        const line = <HTMLElement>lines.children[ln - 1]?.children[0];
        if (line == null) return 0;

        return line.getBoundingClientRect().width / line.innerText.length;
    }

    reset() {
        this.monaco.getModel().setValue("");
        this.holes.forEach((hole) => hole.remove());
        this.holes = [];
    }
}
