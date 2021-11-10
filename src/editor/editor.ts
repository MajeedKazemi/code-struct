import { editor, languages, Range, Selection } from "monaco-editor";
import { CodeConstruct, EditableTextTkn, IdentifierTkn, Statement, TypedEmptyExpr } from "../syntax-tree/ast";
import { TAB_SPACES } from "../syntax-tree/consts";
import { Module } from "../syntax-tree/module";
import { Cursor } from "./cursor";
import { Hole } from "./hole";

const FONT_SIZE = 20;

export class Editor {
    module: Module;
    cursor: Cursor;
    monaco: editor.IStandaloneCodeEditor;
    holes: Hole[];
    mousePosWindow: number[] = [0, 0];
    scrollOffsetTop: number = 0;
    oldCursorLineNumber: number = 1;
    mousePosMonaco: any;

    constructor(parentEl: HTMLElement, module: Module) {
        languages.register({ id: "python3.6" });
        languages.setMonarchTokensProvider("python3.6", {
            defaultToken: "",
            tokenPostfix: ".python",

            keywords: [
                "and",
                "as",
                "assert",
                "break",
                "class",
                "continue",
                "def",
                "del",
                "elif",
                "else",
                "except",
                "exec",
                "finally",
                "for",
                "from",
                "global",
                "if",
                "import",
                "in",
                "is",
                "lambda",
                "None",
                "not",
                "or",
                "pass",
                "print",
                "raise",
                "return",
                "self",
                "try",
                "while",
                "with",
                "yield",

                "int",
                "float",
                "long",
                "complex",
                "hex",

                "abs",
                "all",
                "any",
                "apply",
                "basestring",
                "bin",
                "bool",
                "buffer",
                "bytearray",
                "callable",
                "chr",
                "classmethod",
                "cmp",
                "coerce",
                "compile",
                "complex",
                "delattr",
                "dict",
                "dir",
                "divmod",
                "enumerate",
                "eval",
                "execfile",
                "file",
                "filter",
                "format",
                "frozenset",
                "getattr",
                "globals",
                "hasattr",
                "hash",
                "help",
                "id",
                "input",
                "intern",
                "isinstance",
                "issubclass",
                "iter",
                "len",
                "locals",
                "list",
                "map",
                "max",
                "memoryview",
                "min",
                "next",
                "object",
                "oct",
                "open",
                "ord",
                "pow",
                "print",
                "property",
                "reversed",
                "range",
                "raw_input",
                "reduce",
                "reload",
                "repr",
                "reversed",
                "round",
                "set",
                "setattr",
                "slice",
                "sorted",
                "staticmethod",
                "str",
                "sum",
                "super",
                "tuple",
                "type",
                "unichr",
                "unicode",
                "vars",
                "xrange",
                "zip",

                "True",
                "False",

                "__dict__",
                "__methods__",
                "__members__",
                "__class__",
                "__bases__",
                "__name__",
                "__mro__",
                "__subclasses__",
                "__init__",
                "__import__",
            ],

            escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

            brackets: [
                { open: "{", close: "}", token: "delimiter.curly" },
                { open: "[", close: "]", token: "delimiter.bracket" },
                { open: "(", close: ")", token: "delimiter.parenthesis" },
            ],

            tokenizer: {
                root: [
                    { include: "@whitespace" },
                    { include: "@numbers" },
                    { include: "@strings" },

                    [/[,:;]/, "delimiter"],
                    [/[{}\[\]()]/, "@brackets"],

                    [/@[a-zA-Z]\w*/, "tag"],
                    [
                        /[a-zA-Z]\w*/,
                        {
                            cases: {
                                "@keywords": "keyword",
                                "@default": "identifier",
                            },
                        },
                    ],
                ],

                // Deal with white space, including single and multi-line comments
                whitespace: [
                    [/\s+/, "white"],
                    [/(^#.*$)/, "comment"],
                    [/('''.*''')|(""".*""")/, "string"],
                    [/'''.*$/, "string", "@endDocString"],
                    [/""".*$/, "string", "@endDblDocString"],
                ],
                endDocString: [
                    [/\\'/, "string"],
                    [/.*'''/, "string", "@popall"],
                    [/.*$/, "string"],
                ],
                endDblDocString: [
                    [/\\"/, "string"],
                    [/.*"""/, "string", "@popall"],
                    [/.*$/, "string"],
                ],

                // Recognize hex, negatives, decimals, imaginaries, longs, and scientific notation
                numbers: [
                    [/-?0x([abcdef]|[ABCDEF]|\d)+[lL]?/, "number.hex"],
                    [/-?(\d*\.)?\d+([eE][+\-]?\d+)?[jJ]?[lL]?/, "number"],
                ],

                // Recognize strings, including those broken across lines with \ (but not without)
                strings: [
                    [/'$/, "string.escape", "@popall"],
                    [/'/, "string.escape", "@stringBody"],
                    [/"/, "string", "@string_double"],
                    [/"/, "string.escape", "@dblStringBody"],
                    [/f'/, "string", "@string_backtick"],
                ],
                stringBody: [
                    [/[^\\']+$/, "string", "@popall"],
                    [/[^\\']+/, "string"],
                    [/\\./, "string"],
                    [/'/, "string.escape", "@popall"],
                    [/\\$/, "string"],
                ],
                dblStringBody: [
                    [/[^\\"]+$/, "string", "@popall"],
                    [/[^\\"]+/, "string"],
                    [/\\./, "string"],
                    [/"/, "string.escape", "@popall"],
                    [/\\$/, "string"],
                ],

                string_double: [
                    [/[^\\"]+/, "string"],
                    [/\\./, "string.escape.invalid"],
                    [/"/, "string", "@pop"],
                ],

                string_backtick: [
                    [/\{/, { token: "delimiter.curly", next: "@bracketCounting" }],
                    [/[^\\']/, "string"],
                    [/@escapes/, "string.escape"],
                    [/\\./, "string.escape.invalid"],
                    [/'/, "string", "@pop"],
                ],

                bracketCounting: [
                    [/\{/, "delimiter.curly", "@bracketCounting"],
                    [/\}/, "delimiter.curly", "@pop"],
                    { include: "root" },
                ],
            },
        });

        this.monaco = editor.create(parentEl, {
            folding: false,
            dimension: { height: 500, width: 700 },
            value: "",
            language: "python3.6",
            theme: "vs",
            minimap: {
                enabled: false,
            },
            find: { autoFindInSelection: "never" },
            overviewRulerLanes: 0,
            automaticLayout: true,
            scrollbar: {
                vertical: "auto",
                horizontal: "auto",
                verticalSliderSize: 5,
                scrollByPage: false,
            },
            overviewRulerBorder: false,
            fontSize: FONT_SIZE,
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
            renderWhitespace: "none",
            occurrencesHighlight: false,
        });

        this.cursor = new Cursor(this);
        this.holes = [];
        this.module = module;
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

    executeEdits(range: Range, code: CodeConstruct, overwrite: string = null) {
        let text = overwrite;

        if (overwrite == null) text = code.getRenderText();

        this.monaco.executeEdits("module", [{ range: range, text, forceMoveMarkers: true }]);

        this.addHoles(code);
        this.monaco.focus();
    }

    indentRecursively(statement: Statement, { backward = false }) {
        this.module.editor.executeEdits(
            new Range(
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
                    new Range(
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

        const range = new Range(curPos.lineNumber, curPos.column, curPos.lineNumber, curPos.column);

        this.monaco.executeEdits("module", [{ range: range, text, forceMoveMarkers: true }]);

        for (const code of codeList) this.addHoles(code);
    }

    computeBoundingBox(selection: Selection) {
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

        if (line.getBoundingClientRect().width === 0 && line.innerText.length === 0) {
            return 0;
        }

        return line.getBoundingClientRect().width / line.innerText.length;
    }

    computeCharWidthGlobal() {
        const lines = document.getElementsByClassName("view-lines")[0];

        for (let i = 0; i < lines.children.length; i++) {
            const line = <HTMLElement>lines.children[i]?.children[0];

            if (line.getBoundingClientRect().width !== 0 && line.innerText.length !== 0) {
                return line.getBoundingClientRect().width / line.innerText.length;
            }
        }

        return 0;
    }

    computeCharWidthInvisible(ln = 1): number {
        let width = this.computeCharWidth(ln);
        if (width > 0) return width;

        const lines = Array.from(document.getElementsByClassName("view-lines")[0].children);

        for (const line of lines) {
            if (line.children[0] && (line.children[0] as HTMLElement).innerText.length > 0) {
                return (
                    line.children[0].getBoundingClientRect().width / (line.children[0] as HTMLElement).innerText.length
                );
            }
        }
        return FONT_SIZE / 1.92; //Major hack that probably won't always work, but there is no other way than to manually set
        //the value because monaco does not allow you to get font size unless you have a line within
        //the viewport of the editor that also has text in it.
    }

    reset() {
        this.monaco.getModel().setValue("");
        this.holes.forEach((hole) => hole.remove());
        this.holes = [];
    }
}
