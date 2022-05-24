import {
    Expression,
    ForStatement,
    ListComma,
    Modifier,
    Statement,
    TypedEmptyExpr,
    ValueOperationExpr,
    VarAssignmentStmt,
    VariableReferenceExpr,
    VarOperationStmt,
} from "../syntax-tree/ast";
import { InsertionType, TypeConversionRecord } from "../syntax-tree/consts";
import { Module } from "../syntax-tree/module";
import { Reference } from "../syntax-tree/scope";
import { getUserFriendlyType } from "../utilities/util";
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
                    action.documentation,
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
                null,
                new InsertionResult(varRecord[1], "MESSAGE BASED ON INSERTION TYPE", []), //TODO: Need to actually check what the insertion type is and populate the insertion result accordingly
                [""],
                varStmt.getIdentifier(),
                null,
                [new RegExp("^[\\\\*\\+\\>\\-\\/\\<\\=\\ \\.\\!\\[]$")]
            );
            editAction.performAction = ((
                executor: ActionExecutor,
                eventRouter: EventRouter,
                providedContext: Context,
                source: {},
                autocompleteData?: {}
            ) => {
                let context = providedContext;
                if (autocompleteData) context = executor.deleteAutocompleteOnMatch(providedContext);

                executor.insertVariableReference(varStmt.buttonId, source, context, autocompleteData);
            }).bind(this);
            validOptionMap.set(varStmt.getIdentifier(), editAction);
        }

        return validOptionMap;
    }

    validateVariableOperations(ref: VariableReferenceExpr): Map<string, EditCodeAction> {
        const context = this.module.focus.getContext();
        const dataType = ref.returns;
        const availableModifiers = Actions.instance().varActionsMap.get(dataType);
        const validOptionMap: Map<string, EditCodeAction> = new Map<string, EditCodeAction>();

        if (availableModifiers) {
            for (const varOperation of availableModifiers) {
                const code = varOperation.action() as Expression;

                if (code instanceof VarAssignmentStmt) code.setIdentifier(ref.identifier);
                else if (code instanceof ValueOperationExpr) {
                    code.setVariable(ref);
                    code.updateReturnType();
                } else if (code instanceof VarOperationStmt) {
                    code.setVariable(ref);
                    code.updateModifierTypes();
                } else if (code instanceof ForStatement) {
                    code.setIterator(ref);
                }

                let optionName = code.getRenderText();

                if (code instanceof ForStatement) {
                    optionName = optionName.replace(/   /g, " --");
                } else optionName = optionName.replace(/   /g, " ---");

                const codeAction = new EditCodeAction(
                    optionName,
                    "",
                    () => {
                        const code = varOperation.action() as Expression;

                        if (code instanceof VarAssignmentStmt) code.setIdentifier(ref.identifier);
                        else if (code instanceof ValueOperationExpr) {
                            code.setVariable(ref);
                            code.updateReturnType();
                        } else if (code instanceof VarOperationStmt) {
                            code.setVariable(ref);
                            code.updateModifierTypes();
                        } else if (code instanceof ForStatement) {
                            code.setIterator(ref);
                        }

                        return code;
                    },
                    code instanceof Statement && !(code instanceof Expression)
                        ? InsertActionType.InsertVarOperationStmt
                        : InsertActionType.InsertValOperationExpr,
                    {},
                    null,
                    [""],
                    "",
                    null
                );
                codeAction.insertionResult = codeAction.validateAction(this.module.validator, context);
                codeAction.shortDescription = varOperation.description;
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
            if (
                constructMap.get(option) &&
                constructMap.get(option).insertionResult.insertionType !== InsertionType.Invalid
            ) {
                inserts.push(constructMap.get(option));
            } else if (
                varMap.get(option) &&
                varMap.get(option).insertionResult.insertionType !== InsertionType.Invalid
            ) {
                inserts.push(varMap.get(option));
            } else if (
                editsMap.get(option) &&
                editsMap.get(option).insertionResult.insertionType !== InsertionType.Invalid
            ) {
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

    validateAction(validator: Validator, context: Context): InsertionResult {
        return new InsertionResult(InsertionType.Invalid, "", []);
    }

    performAction(executor: ActionExecutor, eventRouter: EventRouter, context: Context, source: {}) {}
}

export class EditCodeAction extends UserAction {
    insertActionType: InsertActionType;
    insertData: any = {};
    getCodeFunction: () => Statement | Expression;
    terminatingChars: string[];
    insertionResult: InsertionResult;
    matchString: string;
    matchRegex: RegExp;
    insertableTerminatingCharRegex: RegExp[];
    trimSpacesBeforeTermChar: boolean;
    documentation: any;
    shortDescription?: string;

    constructor(
        optionName: string,
        cssId: string,
        getCodeFunction: () => Statement | Expression,
        insertActionType: InsertActionType,
        insertData: any = {},
        documentation: any,
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
        this.documentation = documentation;
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
        documentation: any,
        insertionResult: InsertionResult,
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
            documentation,
            terminatingChars,
            matchString,
            matchRegex,
            insertableTerminatingCharRegex
        );

        action.insertionResult = insertionResult;

        return action;
    }

    getUserFriendlyReturnType(): string {
        const code = this.getCode();

        if (code instanceof Expression && !(code instanceof Modifier) && !(code instanceof ListComma))
            return getUserFriendlyType(code.returns);
        else return "";
    }

    getCode() {
        return this.getCodeFunction();
    }

    //TODO: #526 this might need some updates when that is implemented
    validateAction(validator: Validator, context: Context): InsertionResult {
        const code = this.getCode();
        const astInsertionType = code.validateContext(validator, context);

        if (!(code instanceof Expression)) {
            return new InsertionResult(astInsertionType, "We should never be seeing this message.", []);
        } else if (astInsertionType !== InsertionType.Invalid && code instanceof Expression) {
            if (context.selected) {
                return context.token.rootNode.typeValidateInsertionIntoHole(code, context.token as TypedEmptyExpr); //NOTE: The only expression that can be inserted outside of an empty hole is a variable reference and that will be changed in the future with the introduction of a separate code construct for that
            } else if (!context.selected) {
                return new InsertionResult(astInsertionType, "We should never be seeing this message.", []);
            } else {
                return new InsertionResult(InsertionType.Invalid, "", []);
            }
        } else {
            return new InsertionResult(astInsertionType, "We should never be seeing this message.", []);
        }
    }

    performAction(
        executor: ActionExecutor,
        eventRouter: EventRouter,
        providedContext: Context,
        source: {},
        autocompleteData?: {}
    ) {
        let context = providedContext;

        if (autocompleteData) context = executor.deleteAutocompleteOnMatch(providedContext);

        const editAction = eventRouter.routeToolboxEvents(this, context, source);

        if (editAction.data) editAction.data.autocompleteData = autocompleteData;
        else editAction.data = { autocompleteData };

        executor.execute(editAction, context);
    }
}

//TODO: #526, if we decide to go with message codes, should include the code that would map to the message.
export class InsertionResult {
    insertionType: InsertionType;
    message: string;
    conversionRecords: TypeConversionRecord[];

    constructor(insertionType: InsertionType, msg: string, typeConversionRecord: TypeConversionRecord[]) {
        this.insertionType = insertionType;
        this.message = msg;
        this.conversionRecords = typeConversionRecord;
    }
}
