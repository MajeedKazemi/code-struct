import { Context } from "./focus";
import { Validator } from "./validator";
import { Module } from "../syntax-tree/module";
import { ActionExecutor } from "./action-executor";
import { InsertionType } from "../syntax-tree/consts";
import { Expression, Statement, TypedEmptyExpr } from "../syntax-tree/ast";

export class ActionFilter {
    module: Module;

    constructor(module: Module) {
        this.module = module;
    }

    // static list of user actions + edit actions

    validateInsertions() {
        const context = this.module.focus.getContext();
        // loop over all code-constructs and call their validateContext() + typeValidation() => insertionType

        // we are assuming that the action executor will calculate the insertionType again in the exectue() function
    }

    validateEdits() {}

    validateVariableInsertions() {
        // this.module.variableController
        // get everything from the variable controller
        // create userActions for them
        // create specific cascaded menu actions for them ?!
        // run their validation
    }
}

export class UserAction {
    optionName: string;
    cssId: string;

    constructor(optionName: string, cssId: string) {
        this.optionName = optionName;
        this.cssId = cssId;
    }

    validateAction(validator: Validator, context: Context): InsertionType {
        return InsertionType.Invalid;
    }

    performAction(executor: ActionExecutor) {}
}

export class EditCodeAction extends UserAction {
    code: Statement | Expression;

    constructor(optionName: string, cssId: string, code: Statement | Expression) {
        super(optionName, cssId);

        this.code = code;
    }

    validateAction(validator: Validator, context: Context): InsertionType {
        const astInsertionType = this.code.validateContext(validator, context);

        if (!(this.code instanceof Expression)) {
            return astInsertionType;
        } else if (astInsertionType !== InsertionType.Invalid && this.code instanceof Expression) {
            if (context.selected) {
                return context.token.rootNode.typeValidateInsertionIntoHole(this.code, context.token as TypedEmptyExpr); //NOTE: The only expression that can be inserted outside of an empty hole is a variable reference and that will be changed in the future with the introduction of a separate code construct for that
            } else {
                return InsertionType.Invalid;
            }
        } else {
            return astInsertionType;
        }
    }

    performAction() {
        // executer.execute(this.routeToolboxEvents(insertAction.action, context, insertAction.data), context);
    }
}

export class InsertCodeAction extends UserAction {
    actionKeyPress: string;

    constructor(optionName: string, cssId: string, actionKeyPress: string) {
        super(optionName, cssId);

        this.actionKeyPress = actionKeyPress;
    }

    validateAction(): InsertionType {
        console.log("Validate this action...");
        return InsertionType.Invalid;
    }
    performAction() {}
}

export const AvailableActions = [];
