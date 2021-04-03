import './index.css';
import * as AST from './syntax-tree/ast';

// @ts-ignore
self.MonacoEnvironment = {
	getWorkerUrl: function(moduleId, label) {
		if (label === 'json') {
			return './json.worker.bundle.js';
		}
		if (label === 'css' || label === 'scss' || label === 'less') {
			return './css.worker.bundle.js';
		}
		if (label === 'html' || label === 'handlebars' || label === 'razor') {
			return './html.worker.bundle.js';
		}
		if (label === 'typescript' || label === 'javascript') {
			return './ts.worker.bundle.js';
		}
		return './editor.worker.bundle.js';
	}
};

export let nova = new AST.Module('editor');

document.getElementById('add-var-btn').addEventListener('click', () => {
	nova.insert(new AST.VarAssignmentStmt());
});

document.getElementById('add-print-btn').addEventListener('click', () => {
	nova.insert(
		new AST.FunctionCallStmt('print', [ new AST.Argument(AST.DataType.String, 'item', false) ], AST.DataType.Void)
	);
});

document.getElementById('add-randint-btn').addEventListener('click', () => {
	nova.insert(
		new AST.FunctionCallStmt(
			'randint',
			[
				new AST.Argument(AST.DataType.String, 'start', false),
				new AST.Argument(AST.DataType.String, 'end', false)
			],
			AST.DataType.Number
		)
	);
});

document.getElementById('add-str-btn').addEventListener('click', () => {
	nova.insert(new AST.LiteralValExpr('"txt"', AST.DataType.String));
});

document.getElementById('add-num-btn').addEventListener('click', () => {
	nova.insert(new AST.LiteralValExpr('123', AST.DataType.Number));
});

document.getElementById('add-boolean-btn').addEventListener('click', () => {
	nova.insert(new AST.LiteralValExpr('True', AST.DataType.Boolean));
});

document.getElementById('add-bin-add-expr-btn').addEventListener('click', () => {
	nova.insert(new AST.BinaryOperatorExpr(AST.BinaryOperator.Add, AST.DataType.Any));
});

document.getElementById('add-bin-sub-expr-btn').addEventListener('click', () => {
	nova.insert(new AST.BinaryOperatorExpr(AST.BinaryOperator.Subtract, AST.DataType.Any));
});

document.getElementById('add-bin-mul-expr-btn').addEventListener('click', () => {
	nova.insert(new AST.BinaryOperatorExpr(AST.BinaryOperator.Multiply, AST.DataType.Any));
});

document.getElementById('add-bin-div-expr-btn').addEventListener('click', () => {
	nova.insert(new AST.BinaryOperatorExpr(AST.BinaryOperator.Divide, AST.DataType.Any));
});
