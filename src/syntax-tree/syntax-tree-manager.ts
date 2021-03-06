import * as python from './python-syntax-tree';
import * as monaco from 'monaco-editor';
// the manager will constantly update the syntax-tree with modifications in the text-editor
// it will also guide the text-editor about where the user is editing within the syntax tree

export class SyntaxTreeManager {
	module: python.BodyStmts;

	addFunction(position: monaco.Position, statement: python.CallFunctionExpr) {
		if (!this.module.hasChildren()) {
			this.module.body.push(statement);
		} else {
			// locate where *position* is inside the tree
		}
	}
}
