import {
    BinaryOperator,
    CodeConstruct,
    DataType,
    EmptyExpr,
    ListLiteralExpression,
    Module,
    NonEditableTkn,
    Reference,
    Statement,
    TypedEmptyExpr,
    VarAssignmentStmt,
} from "../syntax-tree/ast";
import { Context } from "./focus";

export class Validator {
    module: Module;

    constructor(module: Module) {
        this.module = module;
    }

    canInsertEmptyList(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        return (
            context.token instanceof EmptyExpr ||
            (context.token instanceof TypedEmptyExpr &&
                context.token.isEmpty &&
                (context.token.type.indexOf(DataType.Any) >= 0 || context.token.type.indexOf(DataType.AnyList) >= 0))
        );
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

    canAddOperatorToRight(operator: BinaryOperator, providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        // TODO: if (context.expressionToLeft.returns == DataType.String && operator == BinaryOperator.Add) return true; else return false;

        return context.expressionToLeft != null && context.expressionToLeft.returns != DataType.Void;
    }

    canAddOperatorToLeft(operator: BinaryOperator, providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        // TODO: if (context.expressionToRight.returns == DataType.String && operator == BinaryOperator.Add) return true; else return false;

        return context.expressionToRight != null && context.expressionToRight.returns != DataType.Void;
    }

    static getValidVariableReferences(code: CodeConstruct): Reference[] {
        let refs = [];

        try {
            if (code instanceof TypedEmptyExpr) {
                let scope = code.getParentStatement()?.scope; //line that contains "code"
                let currRootNode = code.rootNode;

                while (!scope) {
                    if (currRootNode.getParentStatement()?.hasScope()) {
                        scope = currRootNode.getParentStatement().scope;
                    } else if (currRootNode.rootNode instanceof Statement) {
                        currRootNode = currRootNode.rootNode;
                    } else if (currRootNode.rootNode instanceof Module) {
                        scope = currRootNode.rootNode.scope;
                    }
                }

                refs.push(...scope.getValidReferences(code.getSelection().startLineNumber));

                refs = refs.filter(
                    (ref) =>
                        ref.statement instanceof VarAssignmentStmt &&
                        (code.type.indexOf((ref.statement as VarAssignmentStmt).dataType) > -1 ||
                            code.type.indexOf(DataType.Any) > -1)
                );
            }
        } catch (e) {
            console.error("Unable to get valid variable references for " + code + "\n\n" + e);
        } finally {
            return refs;
        }
    }
}
