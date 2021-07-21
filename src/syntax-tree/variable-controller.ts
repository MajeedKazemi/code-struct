import { addVariableReferenceButton, removeVariableReferenceButton } from "../editor/toolbox";
import { VarAssignmentStmt } from "./ast";

export class VariableController {
    private variableButtons: HTMLDivElement[];

    constructor() {
        this.variableButtons = [];
    }

    addVariableRefButton(assignmentStmt: VarAssignmentStmt) {
        const button = addVariableReferenceButton(assignmentStmt.getIdentifier(), assignmentStmt.buttonId);
        this.variableButtons.push(button);
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
        }
    }

    addWarningToVarRefs() {}

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
