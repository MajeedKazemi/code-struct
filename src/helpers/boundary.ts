import * as monaco from 'monaco-editor';

class CodeBoundary {
	startLineNumber: number;
	endLineNumber: number;
	startColumn: number;
	endColumn: number;

	constructor(startLineNumber: number, endLineNumber: number, startColumn: number, endColumn: number) {
		this.startLineNumber = startLineNumber;
		this.endLineNumber = endLineNumber;
		this.startColumn = startColumn;
		this.endColumn = endColumn;
	}

	contains(position: monaco.Position): boolean {
		if (
			position.lineNumber >= this.startLineNumber &&
			position.lineNumber <= this.endLineNumber &&
			position.column >= this.startColumn &&
			position.column <= this.endColumn
		)
			return true;

		return false;
	}

	add(boundary: CodeBoundary) {
		if (boundary.startLineNumber < this.startLineNumber) this.startLineNumber = boundary.startLineNumber;

		if (boundary.endLineNumber > this.endLineNumber) this.endLineNumber = boundary.endLineNumber;

		if (boundary.startColumn < this.startColumn) this.startColumn = boundary.startColumn;

		if (boundary.endColumn > this.endColumn) this.endColumn = boundary.endColumn;
	}
}

export { CodeBoundary };
