import {
    BinaryOperator,
    CodeConstruct,
    DataType,
    EmptyLineStmt,
    InsertionType,
    ListLiteralExpression,
    Module,
    NonEditableTkn,
    Reference,
    Statement,
    TypedEmptyExpr,
    VarAssignmentStmt,
} from "../syntax-tree/ast";
import { TypeSystem } from "../syntax-tree/type-sys";
import { Context } from "./focus";

export class Validator {
    module: Module;

    constructor(module: Module) {
        this.module = module;
    }

    canInsertEmptyLine(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();
        const curPosition = this.module.editor.monaco.getPosition();

        return (
            !context.selected &&
            (curPosition.column == context.lineStatement.left || curPosition.column == context.lineStatement.right)
        );
    }

    /**
     * logic: checks if currently at an empty line.
     * AND is not the only line of the body of a compound statement or Module.
     * AND is not the last line (in the Module or in a compound statement)
     */
    canDeleteCurLine(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        if (context.lineStatement instanceof EmptyLineStmt) {
            return (
                (context.lineStatement.rootNode instanceof Statement ||
                    context.lineStatement.rootNode instanceof Module) &&
                context.lineStatement.rootNode.body.length != 1 &&
                context.lineStatement.indexInRoot != context.lineStatement.rootNode.body.length - 1
            );
        }

        return false;
    }

    canBackspaceCurEmptyLine(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        if (context.lineStatement instanceof EmptyLineStmt) {
            return (
                (context.lineStatement.rootNode instanceof Statement ||
                    context.lineStatement.rootNode instanceof Module) &&
                context.lineStatement.rootNode.body.length != 1
            );
        }

        return false;
    }

    /**
     * logic: checks if the above line is an empty line.
     * AND should be at the beginning of the line.
     */
    canDeletePrevLine(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();
        const curLineNumber = context.lineStatement.lineNumber;
        const curPosition = this.module.editor.monaco.getPosition();

        if (curPosition.column == context.lineStatement.left && curLineNumber > 1) {
            const lineAbove = this.module.focus.getStatementAtLineNumber(curLineNumber - 1);

            if (lineAbove instanceof EmptyLineStmt) return true;
        }

        return false;
    }

    /**
     * logic: checks if at the beginning of a statement, and not text editable.
     */
    canDeleteNextStatement(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        if (!(context.lineStatement instanceof EmptyLineStmt) && this.module.focus.onBeginningOfLine()) {
            if (this.module.focus.isTextEditable(providedContext)) {
                if (context.tokenToRight.isEmpty) return true;
                else return false;
            } else return true;
        }

        return false;
    }

    /**
     * logic: checks if at the end of a statement, and not text editable.
     * AND does not have a body.
     * AND prev item is not an expression that could be deleted by it self.
     */
    canDeletePrevStatement(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        if (
            !(context.lineStatement instanceof EmptyLineStmt) &&
            !context.lineStatement?.hasBody() &&
            this.module.focus.onEndOfLine() &&
            !this.module.focus.isTextEditable(providedContext)
        ) {
            if (context.expressionToLeft != null) {
                if (context.expressionToLeft?.isStatement()) return true;
                else return false;
            }

            return true;
        }

        return false;
    }

    /**
     * logic: checks if at the beginning of an expression, and not at the beginning of a line (statement)
     */
    canDeleteNextToken(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        return (
            !this.module.focus.onBeginningOfLine() &&
            context.expressionToRight != null &&
            !this.module.focus.isTextEditable(providedContext)
        );
    }

    /**
     * logic: checks if at the end of an expression
     */
    canDeletePrevToken(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        return context.expressionToLeft != null && !this.module.focus.isTextEditable(providedContext);
    }

    /**
     * logic:
     * checks if at the beginning of a line
     * AND if it is inside the body of another statement
     * AND if it is the last line of that body
     * AND if the above line is not an empty line
     * AND if it is not the only line of that body
     */
    canIndentBack(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        if (
            this.module.focus.onBeginningOfLine() &&
            context.lineStatement.rootNode instanceof Statement &&
            context.lineStatement.rootNode.hasBody()
        ) {
            const rootsBody = context.lineStatement.rootNode.body;

            return (
                !this.canDeletePrevLine(context) &&
                rootsBody.length != 1 &&
                context.lineStatement.indexInRoot == rootsBody.length - 1
            );
        }

        return false;
    }

    /**
     * logic:
     * checks if at the beginning of a line
     * AND if the above line is an indented line.
     */
    canIndentForward(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        if (this.module.focus.onBeginningOfLine()) {
            if (context.lineStatement.lineNumber > 2) {
                const lineAbove = this.module.focus.getStatementAtLineNumber(context.lineStatement.lineNumber - 1);

                return lineAbove.left != context.lineStatement.left;
            }
        }

        return false;
    }

    canInsertEmptyList(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        return (
            context.token instanceof TypedEmptyExpr &&
            context.token.isEmpty &&
            (context.token.type.indexOf(DataType.Any) >= 0 || context.token.type.indexOf(DataType.AnyList) >= 0)
        );
    }

    canDeleteListItemToLeft(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        if (context.selected && context.token != null && context.token.rootNode instanceof ListLiteralExpression) {
            const itemBefore = context.token.rootNode.tokens[context.token.indexInRoot - 1];

            // [---, |---|] [---, "123", |---|] [---, |---|, 123]
            if (itemBefore instanceof NonEditableTkn && itemBefore.text == ", ") return true;
        }

        return false;
    }

    canDeleteListItemToRight(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        if (context.selected && context.token != null && context.token.rootNode instanceof ListLiteralExpression) {
            const itemBefore = context.token.rootNode.tokens[context.token.indexInRoot - 1];

            // [|---|, ---] [|---|, "123"] [|---|, ---, 123]
            if (itemBefore instanceof NonEditableTkn && itemBefore.text == "[") return true;
        }

        return false;
    }

    canAddListItemToRight(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        // [asd|] [asd, fgh|] [asd|, fgh] => , ---
        return (
            context.tokenToRight instanceof NonEditableTkn &&
            context.tokenToRight.rootNode instanceof ListLiteralExpression &&
            (context.tokenToRight.text == "]" || context.tokenToRight.text == ", ")
        );
    }

    canAddListItemToLeft(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        // [|asd] [|asd, fgh] [asd, |fgh] => ---,

        return (
            context.tokenToLeft instanceof NonEditableTkn &&
            context.tokenToRight.rootNode instanceof ListLiteralExpression &&
            (context.tokenToLeft.text == "[" || context.tokenToLeft.text == ", ")
        );
    }

    atRightOfExpression(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        return context.expressionToLeft != null && context.expressionToLeft.returns != DataType.Void;
    }

    atLeftOfExpression(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        return context.expressionToRight != null && context.expressionToRight.returns != DataType.Void;
    }

    atEmptyExpressionHole(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        return context.selected && context.token.isEmpty && context.token instanceof TypedEmptyExpr;
    }

    //returns a nested list [[Reference, InsertionType], ...]
    static getValidVariableReferences(code: CodeConstruct): Array<(Reference | InsertionType)[]> {
        const refs: Reference[] = [];
        const mappedRefs: Array<(Reference | InsertionType)[]> = []; //no point of making this a map since we don't have access to the refs whereever this method is used. Otherwise would have to use buttonId or uniqueId as keys into the map.

        try {
            if (code instanceof TypedEmptyExpr || code instanceof EmptyLineStmt) {
                let scope =
                    code instanceof TypedEmptyExpr ? code.getParentStatement()?.scope : (code.rootNode as Module).scope; //line that contains "code"
                let currRootNode = code.rootNode;

                while (!scope) {
                    if (!(currRootNode instanceof Module)) {
                        if (currRootNode.getParentStatement()?.hasScope()) {
                            scope = currRootNode.getParentStatement().scope;
                        } else if (currRootNode.rootNode instanceof Statement) {
                            currRootNode = currRootNode.rootNode;
                        } else if (currRootNode.rootNode instanceof Module) {
                            scope = currRootNode.rootNode.scope;
                        }
                    } else {
                        break;
                    }
                }

                refs.push(...scope.getValidReferences(code.getSelection().startLineNumber));

                for (const ref of refs) {
                    if (ref.statement instanceof VarAssignmentStmt) {
                        if (code instanceof TypedEmptyExpr) {
                            if (
                                code.type.indexOf((ref.statement as VarAssignmentStmt).dataType) > -1 ||
                                code.type.indexOf(DataType.Any) > -1
                            ) {
                                mappedRefs.push([ref, InsertionType.Valid]);
                            } else {
                                mappedRefs.push([ref, InsertionType.DraftMode]);
                            }
                        } else if (code instanceof EmptyLineStmt) {
                            //all variables can become var = --- so allow all of them to trigger draft mode
                            mappedRefs.push([ref, InsertionType.DraftMode]);
                        }
                    }
                }
            }
        } catch (e) {
            console.error("Unable to get valid variable references for " + code + "\n\n" + e);
        } finally {
            return mappedRefs;
        }
    }
}
