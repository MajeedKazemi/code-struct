import {
    Expression,
    Statement,
    TypedEmptyExpr,
    ValueOperationExpr,
    VarAssignmentStmt,
    VariableReferenceExpr,
    VarOperationStmt,
} from "../syntax-tree/ast";
import { InsertionType } from "../syntax-tree/consts";
import { Module } from "../syntax-tree/module";
import { Reference } from "../syntax-tree/scope";
import { ActionExecutor } from "./action-executor";
import { Actions, InsertActionType } from "./consts";
import { EventRouter } from "./event-router";
import { Context } from "./focus";
import { Validator } from "./validator";

export class ActionFilter {
    module: Module;

    constructor(module: Module) {
        this.module = module;
    }

    validateInsertions(): Map<string, InsertionRecord> {
        const context = this.module.focus.getContext();
        const validOptionMap: Map<string, InsertionRecord> = new Map<string, InsertionRecord>();
        //need to know InsertionType in case we want to make any visual changes to those options in the suggestion menu

        // loop over all code-constructs and call their validateContext() + typeValidation() => insertionType
        // we are assuming that the action executor will calculate the insertionType again in the exectue() function
        for (const action of Actions.instance().actionsList) {
            validOptionMap.set(
                action.optionName,
                new InsertionRecord(
                    action.validateAction(this.module.validator, context),
                    (() => {
                        action.performAction(this.module.executer, this.module.eventRouter, context);
                    }).bind(this),
                    action.cssId
                )
            );
        }

        return validOptionMap;
    }

    validateEdits(): Map<string, InsertionRecord> {
        // console.warn("validateEdits() is not implemented.");

        return new Map<string, InsertionRecord>();
    }

    validateVariableInsertions(): Map<string, InsertionRecord> {
        const context = this.module.focus.getContext();
        const validOptionMap: Map<string, InsertionRecord> = new Map<string, InsertionRecord>(); //<option name, function to call on click>

        const availableVars: [Reference, InsertionType][] = Validator.getValidVariableReferences(
            context.selected ? context.token : context.lineStatement,
            this.module.variableController
        );

        for (const varRecord of availableVars) {
            const varStmt = varRecord[0].statement as VarAssignmentStmt;

            validOptionMap.set(
                varStmt.getIdentifier(),
                new InsertionRecord(
                    varRecord[1],
                    (() => {
                        this.module.executer.insertVariableReference(varStmt.buttonId, context);
                    }).bind(this),
                    varStmt.buttonId
                )
            );
        }

        return validOptionMap;
    }

    validateVariableOperations(ref: VariableReferenceExpr): Map<string, [InsertionRecord, EditCodeAction]> {
        const context = this.module.focus.getContext();
        const dataType = ref.returns;
        const availableModifiers = Actions.instance().varModifiersMap.get(dataType);
        const validOptionMap: Map<string, [InsertionRecord, EditCodeAction]> = new Map<
            string,
            [InsertionRecord, EditCodeAction]
        >();

        if (availableModifiers) {
            for (const varOperation of availableModifiers) {
                const code = varOperation() as Expression;

                if (code instanceof VarAssignmentStmt) code.setVariable(ref);
                else if (code instanceof ValueOperationExpr) code.setVariable(ref);
                else if (code instanceof VarOperationStmt) code.setVariable(ref);

                const codeAction = new EditCodeAction(
                    `${ref.identifier}${code.getRenderText()}`,
                    "",
                    () => {
                        const code = varOperation() as Expression;

                        if (code instanceof VarAssignmentStmt) code.setVariable(ref);
                        else if (code instanceof ValueOperationExpr) code.setVariable(ref);
                        else if (code instanceof VarOperationStmt) code.setVariable(ref);

                        return code;
                    },
                    code instanceof Statement && !(code instanceof Expression)
                        ? InsertActionType.InsertVarOperationStmt
                        : InsertActionType.InsertValOperationExpr
                );

                validOptionMap.set(codeAction.optionName, [
                    new InsertionRecord(
                        codeAction.validateAction(this.module.validator, context),
                        codeAction.getCode,
                        ""
                    ),
                    codeAction,
                ]);
            }
        }

        return validOptionMap;
    }

    getAllValidInsertsList(): InsertionRecord[] {
        const inserts = [];
        inserts.push(...this.getValidConstructInsertions());
        inserts.push(...this.getValidEditInsertions());
        inserts.push(...this.getValidVariableInsertions());

        return inserts;
    }

    getValidVariableInsertions(): InsertionRecord[] {
        return this.convertInsertionMapToList(this.validateInsertions());
    }

    getValidEditInsertions(): InsertionRecord[] {
        return this.convertInsertionMapToList(this.validateEdits());
    }

    getValidConstructInsertions(): InsertionRecord[] {
        return this.convertInsertionMapToList(this.validateVariableInsertions());
    }

    getValidInsertsFromSet(optionNames: string[]): InsertionRecord[] {
        const constructMap = this.validateInsertions();
        const varMap = this.validateVariableInsertions();
        const editsMap = this.validateEdits();

        const inserts: InsertionRecord[] = [];

        for (const option of optionNames) {
            if (constructMap.get(option) && constructMap.get(option).insertionType !== InsertionType.Invalid) {
                inserts.push(constructMap.get(option));
            } else if (varMap.get(option) && varMap.get(option).insertionType !== InsertionType.Invalid) {
                inserts.push(varMap.get(option));
            } else if (editsMap.get(option) && editsMap.get(option).insertionType !== InsertionType.Invalid) {
                inserts.push(editsMap.get(option));
            }
        }

        return inserts;
    }

    private convertInsertionMapToList(insertionMap: Map<string, InsertionRecord>): InsertionRecord[] {
        const inserts = [];
        for (const [key, value] of insertionMap.entries()) {
            inserts.push(value);
        }

        return inserts;
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
    insertActionType: InsertActionType;
    insertData: any = {};
    getCodeFunction: () => Statement | Expression;

    constructor(
        optionName: string,
        cssId: string,
        getCodeFunction: () => Statement | Expression,
        insertActionType: InsertActionType,
        insertData: any = {}
    ) {
        super(optionName, cssId);

        this.getCodeFunction = getCodeFunction;
        this.insertActionType = insertActionType;
        this.insertData = insertData;
    }

    getCode() {
        return this.getCodeFunction();
    }

    validateAction(validator: Validator, context: Context): InsertionType {
        const code = this.getCode();
        const astInsertionType = code.validateContext(validator, context);

        if (!(code instanceof Expression)) {
            return astInsertionType;
        } else if (astInsertionType !== InsertionType.Invalid && code instanceof Expression) {
            if (context.selected) {
                return context.token.rootNode.typeValidateInsertionIntoHole(code, context.token as TypedEmptyExpr); //NOTE: The only expression that can be inserted outside of an empty hole is a variable reference and that will be changed in the future with the introduction of a separate code construct for that
            } else if (!context.selected) {
                return astInsertionType;
            } else {
                return InsertionType.Invalid;
            }
        } else {
            return astInsertionType;
        }
    }

    performAction(executor: ActionExecutor, eventRouter: EventRouter, context: Context) {
        executor.execute(eventRouter.routeToolboxEvents(this, context), context);
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

export class InsertionRecord {
    insertionType: InsertionType;
    getCode: Function;
    domButtonId: string;

    constructor(insertionType: InsertionType, getCode: Function, domButtonId: string) {
        this.insertionType = insertionType;
        this.getCode = getCode;
        this.domButtonId = domButtonId;
    }
}
