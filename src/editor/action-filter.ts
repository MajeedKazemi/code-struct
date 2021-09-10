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

    validateInsertions(): Map<string, EditCodeAction> {
        const context = this.module.focus.getContext();
        const validOptionMap: Map<string, EditCodeAction> = new Map<string, EditCodeAction>();
        //need to know InsertionType in case we want to make any visual changes to those options in the suggestion menu

        // loop over all code-constructs and call their validateContext() + typeValidation() => insertionType
        // we are assuming that the action executor will calculate the insertionType again in the exectue() function
        for (const action of Actions.instance().actionsList) {
            validOptionMap.set(
                action.optionName,
                EditCodeAction.createDynamicEditCodeAction(
                    action.optionName,
                    action.cssId,
                    action.getCodeFunction,
                    action.insertActionType,
                    action.insertData,
                    action.validateAction(this.module.validator, context),
                    action.terminatingChars,
                    action.matchString,
                    action.matchRegex,
                    action.insertableTerminatingCharRegex
                )
            );
        }

        return validOptionMap;
    }

    validateEdits(): Map<string, EditCodeAction> {
        // console.warn("validateEdits() is not implemented.");

        return new Map<string, EditCodeAction>();
    }

    validateVariableInsertions(): Map<string, EditCodeAction> {
        const context = this.module.focus.getContext();
        const validOptionMap: Map<string, EditCodeAction> = new Map<string, EditCodeAction>(); //<option name, function to call on click>

        const availableVars: [Reference, InsertionType][] = Validator.getValidVariableReferences(
            context.selected ? context.token : context.lineStatement,
            this.module.variableController
        );

        for (const varRecord of availableVars) {
            const varStmt = varRecord[0].statement as VarAssignmentStmt;
            const editAction = EditCodeAction.createDynamicEditCodeAction(
                varStmt.getIdentifier(),
                varStmt.buttonId,
                () => {
                    return null;
                },
                null,
                {},
                varRecord[1],
                [""],
                varStmt.getIdentifier(),
                null,
                [new RegExp("^[\\\\*\\+\\>\\-\\/\\<\\=\\ \\.\\!\\[]$")]
            );
            editAction.performAction = ((
                executor: ActionExecutor,
                eventRouter: EventRouter,
                providedContext: Context,
                autocompleteData?: {}
            ) => {
                let context = providedContext;
                if (autocompleteData) context = executor.deleteAutocompleteOnMatch(providedContext);

                executor.insertVariableReference(varStmt.buttonId, context, autocompleteData);
            }).bind(this);
            validOptionMap.set(varStmt.getIdentifier(), editAction);
        }

        return validOptionMap;
    }

    validateVariableOperations(ref: VariableReferenceExpr): Map<string, EditCodeAction> {
        const context = this.module.focus.getContext();
        const dataType = ref.returns;
        const availableModifiers = Actions.instance().varModifiersMap.get(dataType);
        const validOptionMap: Map<string, EditCodeAction> = new Map<string, EditCodeAction>();

        if (availableModifiers) {
            for (const varOperation of availableModifiers) {
                const code = varOperation() as Expression;

                if (code instanceof VarAssignmentStmt) code.setIdentifier(ref.identifier);
                else if (code instanceof ValueOperationExpr) {
                    code.setVariable(ref);
                    code.updateReturnType();
                } else if (code instanceof VarOperationStmt) {
                    code.setVariable(ref);
                    code.updateModifierTypes();
                }

                const codeAction = new EditCodeAction(
                    code.getRenderText().replace(/   /g, " ---"),
                    "",
                    () => {
                        const code = varOperation() as Expression;

                        if (code instanceof VarAssignmentStmt) code.setIdentifier(ref.identifier);
                        else if (code instanceof ValueOperationExpr) {
                            code.setVariable(ref);
                            code.updateReturnType();
                        } else if (code instanceof VarOperationStmt) {
                            code.setVariable(ref);
                            code.updateModifierTypes();
                        }

                        return code;
                    },
                    code instanceof Statement && !(code instanceof Expression)
                        ? InsertActionType.InsertVarOperationStmt
                        : InsertActionType.InsertValOperationExpr,
                    {},
                    [""],
                    "",
                    null
                );
                codeAction.insertionType = codeAction.validateAction(this.module.validator, context);

                validOptionMap.set(codeAction.optionName, codeAction);
            }
        }

        return validOptionMap;
    }

    getProcessedInsertionsList(): EditCodeAction[] {
        const inserts = [];
        inserts.push(...this.getProcessedConstructInsertions());
        inserts.push(...this.getProcessedEditInsertions());
        inserts.push(...this.getProcessedVariableInsertions());
        inserts.push(...this.getProcessedVariableOperations());

        return inserts;
    }

    getProcessedVariableInsertions(): EditCodeAction[] {
        return this.convertInsertionMapToList(this.validateVariableInsertions());
    }

    getProcessedEditInsertions(): EditCodeAction[] {
        return this.convertInsertionMapToList(this.validateEdits());
    }

    getProcessedConstructInsertions(): EditCodeAction[] {
        return this.convertInsertionMapToList(this.validateInsertions());
    }

    getProcessedVariableOperations(): EditCodeAction[] {
        const context = this.module.focus.getContext();
        const availableRefs: [Reference, InsertionType][] = Validator.getValidVariableReferences(
            context.selected ? context.token : context.lineStatement,
            this.module.variableController
        );

        const validActionsForVar: Map<string, EditCodeAction>[] = [];
        for (const refRecord of availableRefs) {
            const varAssignmentStmt = refRecord[0].statement as VarAssignmentStmt;
            const dataType = this.module.variableController.getVariableTypeNearLine(
                context.lineStatement.hasScope() ? context.lineStatement.scope : context.lineStatement.rootNode.scope,
                context.lineStatement.lineNumber,
                varAssignmentStmt.getIdentifier()
            );
            const varRef = new VariableReferenceExpr(
                varAssignmentStmt.getIdentifier(),
                dataType,
                varAssignmentStmt.buttonId
            );

            validActionsForVar.push(this.validateVariableOperations(varRef));
        }

        const actionsList: EditCodeAction[] = [];
        for (const map of validActionsForVar) {
            actionsList.push(...this.convertInsertionMapToList(map));
        }

        return actionsList;
    }

    getValidInsertsFromSet(optionNames: string[]): EditCodeAction[] {
        const constructMap = this.validateInsertions();
        const varMap = this.validateVariableInsertions();
        const editsMap = this.validateEdits();

        const inserts: EditCodeAction[] = [];

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

    private convertInsertionMapToList(insertionMap: Map<string, EditCodeAction>): EditCodeAction[] {
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
    terminatingChars: string[];
    insertionType: InsertionType;
    matchString: string;
    matchRegex: RegExp;
    insertableTerminatingCharRegex: RegExp[];
    trimSpacesBeforeTermChar: boolean;

    constructor(
        optionName: string,
        cssId: string,
        getCodeFunction: () => Statement | Expression,
        insertActionType: InsertActionType,
        insertData: any = {},
        terminatingChars: string[],
        matchString: string,
        matchRegex: RegExp,
        insertableTerminatingCharRegex?: RegExp[],
        trimSpacesBeforeTermChar: boolean = false
    ) {
        super(optionName, cssId);

        this.getCodeFunction = getCodeFunction;
        this.insertActionType = insertActionType;
        this.insertData = insertData;
        this.terminatingChars = terminatingChars;
        this.matchString = matchString;
        this.matchRegex = matchRegex;
        this.insertableTerminatingCharRegex = insertableTerminatingCharRegex;
        this.trimSpacesBeforeTermChar = trimSpacesBeforeTermChar;
    }

    static createDynamicEditCodeAction(
        optionName: string,
        cssId: string,
        getCodeFunction: () => Statement | Expression,
        insertActionType: InsertActionType,
        insertData: any = {},
        insertionType: InsertionType,
        terminatingChars: string[],
        matchString: string,
        matchRegex: RegExp,
        insertableTerminatingCharRegex?: RegExp[]
    ) {
        const action = new EditCodeAction(
            optionName,
            cssId,
            getCodeFunction,
            insertActionType,
            insertData,
            terminatingChars,
            matchString,
            matchRegex,
            insertableTerminatingCharRegex
        );

        action.insertionType = insertionType;

        return action;
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

    performAction(executor: ActionExecutor, eventRouter: EventRouter, providedContext: Context, autocompleteData?: {}) {
        let context = providedContext;

        if (autocompleteData) context = executor.deleteAutocompleteOnMatch(providedContext);

        const editAction = eventRouter.routeToolboxEvents(this, context);

        if (editAction.data) editAction.data.autocompleteData = autocompleteData;
        else editAction.data = { autocompleteData };

        executor.execute(editAction, context);
    }
}
