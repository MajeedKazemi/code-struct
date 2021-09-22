var controller;
import {
    addVariableReferenceButton,
    createCascadedMenuForVarRef,
    removeVariableReferenceButton,
} from "../editor/toolbox";
import { getUserFriendlyType } from "../utilities/util";
import { CodeConstruct, Expression, ForStatement, Statement, VarAssignmentStmt, VariableReferenceExpr } from "./ast";
import { DataType } from "./consts";
import { Module } from "./module";
import { Scope } from "./scope";

export class VariableController {
    private variableButtons: HTMLDivElement[];
    private module: Module;

    constructor(module: Module) {
        this.variableButtons = [];
        this.module = module;
    }

    addVariableRefButton(assignmentStmt: VarAssignmentStmt) {
        const button = addVariableReferenceButton(
            assignmentStmt.getIdentifier(),
            assignmentStmt.buttonId,
            this.module.eventStack
        );
        this.variableButtons.push(button);

        createCascadedMenuForVarRef(assignmentStmt.buttonId, assignmentStmt.getIdentifier(), this.module);
    }

    isVariableReferenceButton(buttonId: string) {
        return (
            this.module.variableController
                .getVariableButtons()
                .map((buttonElement) => buttonElement.id)
                .indexOf(buttonId) > -1
        );
    }

    removeVariableRefButton(varId: string) {
        let indexOfButton = -1;
        for (let i = 0; i < this.variableButtons.length; i++) {
            if (this.variableButtons[i].id === varId) {
                indexOfButton = i;
            }
        }

        if (indexOfButton > -1) {
            removeVariableReferenceButton(varId);
            this.variableButtons.splice(indexOfButton, 1);
        }
    }

    addWarningToVarRefs(varId: string, module: Module) {
        const varRefs = this.getVarRefsBFS(varId, module);
        const notfiSys = module.notificationSystem;
        for (const ref of varRefs) {
            notfiSys.addHoverNotification(
                ref,
                null,
                "This variable has been removed and cannot be referenced anymore. Consider deleting this reference."
            );
        }
    }

    getVariableButtons(): HTMLDivElement[] {
        return this.variableButtons;
    }

    getVariableButton(varId: string) {
        const buttons = this.variableButtons.filter((button) => button.id === varId);

        if (buttons.length === 0) {
            return null;
        }

        return buttons[0];
    }

    hideUnavailableVarsInToolbox(scope: Scope, lineNumber: number) {
        const availableRefs = scope
            ?.getValidReferences(lineNumber)
            ?.map((ref) => (ref.statement as VarAssignmentStmt).buttonId);

        if (availableRefs) {
            for (const button of this.variableButtons) {
                if (availableRefs.indexOf(button.id) === -1) {
                    button.parentElement.parentElement.style.display = "none";
                } else {
                    button.parentElement.parentElement.style.display = "grid";

                    button.parentElement.parentElement.children[1].innerHTML =
                        "-> " +
                        getUserFriendlyType(this.getVariableTypeNearLine(scope, lineNumber, button.textContent));
                }
            }
        }
    }

    updateVarButtonWithType(buttonId: string, scope: Scope, lineNumber: number, identifier: string) {
        this.variableButtons.filter(
            (button) => button.id === buttonId
        )[0].parentElement.parentElement.children[1].innerHTML =
            "-> " + getUserFriendlyType(this.getVariableTypeNearLine(scope, lineNumber, identifier, false));
    }

    getVariableTypeNearLine(
        scope: Scope,
        lineNumber: number,
        identifier: string,
        excludeCurrentLine: boolean = true
    ): DataType {
        const focus = this.module.focus;
        const assignmentsToVar = scope.getAllAssignmentsToVarAboveLine(
            identifier,
            this.module,
            lineNumber,
            excludeCurrentLine
        );

        //find closest var assignment
        let smallestDiffIndex = 0;
        for (let i = 0; i < assignmentsToVar.length; i++) {
            if (
                lineNumber - assignmentsToVar[i].lineNumber <
                lineNumber - assignmentsToVar[smallestDiffIndex].lineNumber
            ) {
                smallestDiffIndex = i;
            }
        }

        //determine type
        const closestStatement = assignmentsToVar[smallestDiffIndex] as VarAssignmentStmt;
        const statementAtLine = focus.getStatementAtLineNumber(lineNumber);

        if (closestStatement.rootNode === statementAtLine.rootNode) {
            //same scope, therefore just use closest type
            return closestStatement.dataType;
        } else {
            //diff scopes
            const types = assignmentsToVar
                .filter((assignment) => assignment.lineNumber <= lineNumber)
                .map((filteredRecord) => (filteredRecord as VarAssignmentStmt).dataType);
            const firstType = types[0];
            const statementAtLineScope = statementAtLine.hasScope()
                ? statementAtLine.scope
                : (statementAtLine.rootNode as Module | Statement).scope;
            const closestStatementScope = closestStatement.hasScope()
                ? closestStatement.scope
                : (closestStatement.rootNode as Module | Statement).scope;

            //if all types are equal, then it is safe to return that type
            if (types.every((type) => type === firstType)) {
                return firstType;
            } else if (statementAtLineScope.parentScope === closestStatementScope) {
                /**
                 * abc = 123
                 * abc = ""
                 *
                 * if ---:
                 *    ref abc here should be string, not Any
                 */
                return types[types.length - 1];
            } else {
                return DataType.Any;
            }
        }
    }

    isVarStmtReassignment(varStmt: VarAssignmentStmt, module: Module): boolean {
        const Q: CodeConstruct[] = [];
        Q.unshift(...module.body.filter((stmt) => stmt.lineNumber < varStmt.lineNumber));

        while (Q.length > 0) {
            const currCodeConstruct = Q.pop();

            if (currCodeConstruct instanceof Statement) {
                Q.unshift(...currCodeConstruct.body);

                if (
                    currCodeConstruct instanceof VarAssignmentStmt &&
                    currCodeConstruct.getIdentifier() === varStmt.getIdentifier() &&
                    currCodeConstruct.lineNumber < varStmt.lineNumber
                ) {
                    return true;
                }
            }
        }

        return false;
    }

    getAllAssignmentsToVar(varId: string, module: Module): VarAssignmentStmt[] {
        const Q: CodeConstruct[] = [];
        const result: VarAssignmentStmt[] = [];
        Q.push(...module.body);

        while (Q.length > 0) {
            const currCodeConstruct = Q.splice(0, 1)[0];
            if (currCodeConstruct instanceof Expression) {
                Q.push(...currCodeConstruct.tokens);
            } else if (currCodeConstruct instanceof Statement) {
                Q.push(...currCodeConstruct.body);
                Q.push(...currCodeConstruct.tokens);

                if (currCodeConstruct instanceof VarAssignmentStmt && currCodeConstruct.buttonId === varId) {
                    result.push(currCodeConstruct);
                } else if (currCodeConstruct instanceof ForStatement && currCodeConstruct.loopVar.buttonId === varId) {
                    result.push(currCodeConstruct.loopVar);
                }
            }
        }

        return result;
    }

    private getVarRefsBFS(varId: string, module: Module): VariableReferenceExpr[] {
        const Q: CodeConstruct[] = [];
        const result: VariableReferenceExpr[] = [];
        Q.push(...module.body);

        while (Q.length > 0) {
            const currCodeConstruct = Q.pop();

            if (currCodeConstruct instanceof Expression) {
                Q.push(...currCodeConstruct.tokens);

                if (currCodeConstruct instanceof VariableReferenceExpr && currCodeConstruct.uniqueId === varId) {
                    result.push(currCodeConstruct);
                }
            } else if (currCodeConstruct instanceof Statement) {
                Q.push(...currCodeConstruct.body);
                Q.push(...currCodeConstruct.tokens);
            }
        }

        return result;
    }
}

/*
  Class representing a Map<string, Array<[number, DataType]>> object that contains information about
  variable assignments in the form map.get(varID) = [lineNumber, DataType][]

export class VariableAssignmentMap {
    private map: Map<string, Array<[number, DataType]>>;

    constructor() {
        this.map = new Map<string, [number, DataType][]>();
    }


     * Add a new type assignment record to the variable with the given varID.
     *
     * If an entry for this variable does not exist, one will be created.
     * If there is already an assignment record with the exact same lineNumber, then the old one will be updated to reflect
     * the type provided.

    addRecord(varID: string, lineNumber: number, type: DataType) {
        const recordsList = this.map.get(varID);

        if (recordsList && recordsList.length >= 0) {
            const existingRecord = this.getRecordByLineNumber(recordsList, lineNumber);
            if (!existingRecord) {
                recordsList.push([lineNumber, type]);
            } else {
                this.updateRecord(varID, lineNumber, type);
            }
        } else if (!recordsList) {
            this.map.set(varID, [[lineNumber, type]]);
        }
    }


     * Update an exisiting record with a new type. If the record with the provided lineNumber
     * does not exist or there is no entry in the map for the variable with the provided identifier
     * then the method does nothing.

    updateRecord(identifier: string, lineNumber: number, type: DataType) {
        if (this.map.get(identifier)) {
            const record = this.getRecordByLineNumber(this.map.get(identifier), lineNumber);

            if (record) {
                record[1] = type;
            }
        }
    }


     * Remove a single assignment record from the list of records for the given variable from the entry for this variable.

    removeRecord(varID: string, lineNumber: number) {
        if (this.map.get(varID)) {
            this.map.get(varID).splice(this.getRecordIndex(this.map.get(varID), lineNumber), 1);
        }
    }


     * Remove all assignment records for a given variable from the map.

    removeRecordsList(varID: string) {
        if (this.map.get(varID)) {
            this.map.delete(varID);
        }
    }


     * Return a list of assignment records for a given variable.
     *
     * @returns a list of tuples [lineNumber, type] if the list exists. [] otherwise.

    getRecords(identifier: string): [number, DataType][] {
        if (this.map.get(identifier)) {
            return this.map.get(identifier);
        }

        return [];
    }


     * Return the type a variable is assigned on a given line.
     *
     * @returns the type of expression assigned to the variable on the given line. null if there is no assignment on that line.

    getAssignedTypeOnLine(varID: string, lineNumber: number): DataType {
        if (this.map.get(varID)) {
            const record = this.getRecordByLineNumber(this.map.get(varID), lineNumber);
            return record ? record[1] : null;
        }
    }


     * Return the inferred data type of a variable on a given line.
     *
     * @returns inferred data type of the variable on lineNumber. null otherwise.

    getAssignedTypeNearLine(varID: string, lineNumber: number, focus: Focus): DataType {
        if (this.map.get(varID)) {
            const record = this.getRecordByLineNumber(this.map.get(varID), lineNumber);

            if (record) {
                return record[1];
            } else {
                const records: [number, DataType][] = this.map.get(varID);
                const recordLines = records.map((record) => record[0]).filter((line) => line <= lineNumber);

                if (recordLines.length === 0) {
                    //lineNumber is above all assignments to this var
                    return null;
                }

                //find assignment closest to lineNumber
                let smallestDiffIndex = 0;
                for (let i = 0; i < recordLines.length; i++) {
                    if (lineNumber - recordLines[i] < lineNumber - recordLines[smallestDiffIndex]) {
                        smallestDiffIndex = i;
                    }
                }

                //determine type
                const record = records[smallestDiffIndex];
                const statementAtRefLine = focus.getStatementAtLineNumber(lineNumber);
                const assignemntStmt = focus.getStatementAtLineNumber(record[0]);

                if (statementAtRefLine.rootNode === assignemntStmt.rootNode) {
                    return record[1];
                } else {
                    //find all assignments and their type above lineNumber
                    const types = records
                        .filter((record) => record[0] <= lineNumber)
                        .map((filteredRecord) => filteredRecord[1]);
                    const firstType = types[0];

                    //if all types are equal, then it is safe to return that type
                    if (types.every((type) => type === firstType)) {
                        return firstType;
                    } else {
                        return DataType.Any;
                    }
                }
            }
        }

        return null;
    }

    isVariableInMap(varID: string): boolean {
        return this.map.get(varID)?.length > 0 ?? false;
    }

    private getRecordByLineNumber(recordsList: [number, DataType][], lineNumber: number): [number, DataType] {
        for (const record of recordsList) {
            if (record[0] === lineNumber) {
                return record;
            }
        }

        return null;
    }

    private getRecordIndex(recordsList: [number, DataType][], lineNumber: number): number {
        for (let i = 0; i < recordsList.length; i++) {
            if (recordsList[i][0] === lineNumber) {
                return i;
            }
        }

        return -1;
    }
}
*/
