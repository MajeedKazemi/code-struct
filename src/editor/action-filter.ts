import { Context } from "./focus";
import { Validator } from "./validator";
import { Module } from "../syntax-tree/module";
import { ActionExecutor } from "./action-executor";
import { DataType, InsertionType } from "../syntax-tree/consts";
import { Expression, FunctionCallStmt, Statement, TypedEmptyExpr, VarAssignmentStmt } from "../syntax-tree/ast";
import { Actions, InsertActionType } from "./consts";
import { Reference } from "../syntax-tree/scope";
import { EventRouter } from "./event-router";

export class ActionFilter {
    module: Module;

    constructor(module: Module) {
        this.module = module;
    }

    // static list of user actions + edit actions

    validateInsertions(): Map<string, [InsertionType, Function]> {
        const context = this.module.focus.getContext();
        const validOptionMap: Map<string, [InsertionType, Function]> = new Map<string, [InsertionType, Function]>(); //<option name, function to call on click>
        //need to know InsertionType in case we want to make any visual changes to those options in the suggestion menu

        // loop over all code-constructs and call their validateContext() + typeValidation() => insertionType
        // we are assuming that the action executor will calculate the insertionType again in the exectue() function
        for (const action of Actions.instance().actionsList) {
            validOptionMap.set(action.optionName, [
                action.validateAction(this.module.validator, context),
                (() => {
                    action.performAction(this.module.executer, this.module.eventRouter, context);
                }).bind(this),
            ]);
        }

        return validOptionMap;
    }

    validateEdits() {
        throw new Error("Not Implemented");
    }

    validateVariableInsertions(): Map<string, [InsertionType, Function]> {
        const context = this.module.focus.getContext();
        const validOptionMap: Map<string, [InsertionType, Function]> = new Map<string, [InsertionType, Function]>(); //<option name, function to call on click>

        const availableVars: [Reference, InsertionType][] = Validator.getValidVariableReferences(
            context.selected ? context.token : context.lineStatement,
            this.module.variableController
        );

        for (const varRecord of availableVars) {
            const varStmt = varRecord[0].statement as VarAssignmentStmt;

            validOptionMap.set(varStmt.getIdentifier(), [
                varRecord[1],
                (() => {
                    this.module.executer.execute(
                        this.module.eventRouter.routeToolboxEvents(
                            new EditCodeAction(
                                varStmt.getIdentifier(),
                                varStmt.buttonId,
                                varStmt,
                                InsertActionType.InsertVariableReference,
                                { buttonId: varStmt.buttonId }
                            ),
                            context
                        ),
                        context
                    );
                }).bind(this),
            ]);
        }

        return validOptionMap;
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

    performAction(executor: ActionExecutor, eventRouter: EventRouter, context: Context) {}
}

export class EditCodeAction extends UserAction {
    code: Statement | Expression;
    insertActionType: InsertActionType;
    insertData: any = {};

    constructor(
        optionName: string,
        cssId: string,
        code: Statement | Expression,
        insertActionType: InsertActionType,
        insertData: any = {}
    ) {
        super(optionName, cssId);

        this.code = code;
        this.insertActionType = insertActionType;
        this.insertData = insertData;
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

    performAction(executor: ActionExecutor, eventRouter: EventRouter, context: Context) {
        // executor.execute(eventRouter.routeToolboxEvents(this.insertActionType, context, this.insertData), context);
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
