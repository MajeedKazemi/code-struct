import { BinaryOperator, DataType, Module, NonEditableTkn } from "../syntax-tree/ast";
import { Context } from "./focus";

export class Validator {
    module: Module;

    constructor(module: Module) {
        this.module = module;
    }

    canAddListItemToRight(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        // [asd|] [asd, fgh|] [asd|, fgh] => , ---
        return (
            context.tokenToRight instanceof NonEditableTkn &&
            (context.tokenToRight.text == "]" || context.tokenToRight.text == ", ")
        );
    }

    canAddListItemToLeft(providedContext?: Context): boolean {
        const context = providedContext ? providedContext : this.module.focus.getContext();

        // [|asd] [|asd, fgh] [asd, |fgh] => ---,

        return (
            context.tokenToLeft instanceof NonEditableTkn &&
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
}
