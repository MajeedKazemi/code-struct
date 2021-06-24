import { Editor } from "../editor/editor";
import {
    BinaryOperator,
    BinaryOperatorExpr,
    CodeConstruct,
    LiteralValExpr,
    Module,
    DataType,
    Token,
} from "../syntax-tree/ast";
import * as monaco from "monaco-editor";

export class ConstructCompleter {
    static instance: ConstructCompleter;
    private editor: Editor;
    private module: Module;

    private constructor() {}

    static getInstance() {
        if (!ConstructCompleter.instance) {
            ConstructCompleter.instance = new ConstructCompleter();
        }

        return ConstructCompleter.instance;
    }

    setInstanceContext(module: Module, editor: Editor) {
        this.editor = editor;
        this.module = module;
    }

    completeLiteralConstruct(literalType: DataType, value: string) {
        this.module.insert(new LiteralValExpr(literalType, value));
    }

    completeBoolLiteralConstruct(boolValue: Number) {
        this.module.insert(new LiteralValExpr(DataType.Boolean, boolValue ? "True" : "False"));
    }

    completeArithmeticConstruct(operator: BinaryOperator) {
        console.log("Refactor me.")
       /* const context = this.module.focus.getContext();
        //TODO: Currently locate() returns EndOfLine and StartOfLine tokens as well
        //Once that changes, need to modify this to not use the rootNode because presumably it would be returning a statement or an expression

        const cursorPos = this.editor.monaco.getPosition();
        const closestConstruct = (context.tokenToRight ? context.tokenToRight : context.expressionToRight);
        const parentRoot = closestConstruct.rootNode as CodeConstruct;

        if (!(closestConstruct instanceof Module)) {
            const selection = closestConstruct.getSelection();

            if (
                selection.endColumn >= cursorPos.column &&
                closestConstruct instanceof LiteralValExpr &&
                closestConstruct.allowedBinOps.indexOf(operator) > -1
            ) {
                //for now if the cursor is to the right of a literal val, it is treated as being inside the literal val so keyboard input is treated as inTextEditMode. This makes it only possible to perform + when cursor is to the left of literal

                const newConstruct = new BinaryOperatorExpr(
                    operator,
                    closestConstruct.returns,
                    parentRoot,
                    closestConstruct.indexInRoot
                );
                const newLiteralValExpr = new LiteralValExpr(
                    closestConstruct.returns,
                    closestConstruct.getRenderText().replace(/"/g, "")
                );
                newConstruct.replaceLeftOperand(newLiteralValExpr);

                //TODO: This is duplicate code from Module. Refactor this into a method inside of module!!!
                this.module.replaceFocusedExpression(newConstruct);

                let padding = 1;
                let selection = this.editor.monaco.getSelection();

                if (selection.endColumn == selection.startColumn) padding = 0;

                let range = new monaco.Range(
                    closestConstruct.lineNumber,
                    closestConstruct.left,
                    closestConstruct.lineNumber,
                    closestConstruct.right + padding
                );

                this.editor.executeEdits(range, newConstruct);
                this.editor.module.focus.updateContext({tokenToSelect: newConstruct.tokens[newConstruct.getRightOperandIndex()] as Token});
                this.editor.focusSelection();
            }
        }*/
    }
}

