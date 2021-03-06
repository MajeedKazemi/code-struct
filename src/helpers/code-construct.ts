import * as python from '../syntax-tree/python-syntax-tree';
import * as monaco from 'monaco-editor';

export class CodeConstruct {
	code: string;
	statement: python.Statement;
	initialCursorDiff: monaco.Position;
	selectionChars: number;

	constructor(code: string, statemnt: python.Statement, initialCursorDiff: monaco.Position, selectionChars: number) {
		this.code = code;
		this.statement = statemnt;
		this.initialCursorDiff = initialCursorDiff;
		this.selectionChars = selectionChars;
	}
}
