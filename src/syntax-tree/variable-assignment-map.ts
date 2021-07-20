import { Focus } from "../editor/focus";
import { DataType } from "./consts"
import { Module } from "./module";

/**
 * Class representing a Map<string, Array<[number, DataType]>> object that contains information about
 * variable assignments in the form map.get(identifier) = [lineNumber, DataType][]
 */
export class VariableAssignmentMap{
    private map: Map<string, Array<[number, DataType]>>;

    constructor(){
        this.map = new Map<string, [number, DataType][]>();
    }

    /**
     * Add a new type assignment record to the variable with the given identifier.
     * 
     * If an entry for this variable does not exist, one will be created. 
     * If there is already an assignment record with the exact same lineNumber, then the old one will be updated to reflect 
     * the type provided.
     */
    addRecord(identifier: string, lineNumber: number, type: DataType){
        const recordsList = this.map.get(identifier);

        if(recordsList && recordsList.length >= 0){
            const existingRecord = this.getRecordByLineNumber(recordsList, lineNumber)
            if(!existingRecord){
                recordsList.push([lineNumber, type])
            }
            else{
                this.updateRecord(identifier, lineNumber, type);
            }
        }
        else if(!recordsList){
            this.map.set(identifier, [[lineNumber, type]]);
        }
    }

    /**
     * Update an exisiting record with a new type. If the record with the provided lineNumber
     * does not exist or there is no entry in the map for the variable with the provided identifier
     * then the method does nothing.
     */
    updateRecord(identifier: string, lineNumber: number, type: DataType){
        if(this.map.get(identifier)){
            const record = this.getRecordByLineNumber(this.map.get(identifier), lineNumber);

            if(record){
                record[1] = type;
            }
        }
    }

    /**
     * Remove a single assignment record from the list of records for the given variable from the entry for this variable.
     */
    removeRecord(identifier: string, lineNumber: number){
        if(this.map.get(identifier)){
            this.map.get(identifier).splice(this.getRecordIndex(this.map.get(identifier), lineNumber), 1)
        }
    }

    /**
     * Remove all assignment records for a given variable from the map.
     */
    removeRecordsList(identifier: string){
        if(this.map.get(identifier)){
            this.map.delete(identifier);
        }
    }

    /**
     * Return a list of assignment records for a given variable.
     *  
     * @returns a list of tuples [lineNumber, type] if the list exists. [] otherwise.
     */
    getRecords(identifier: string): [number, DataType][]{
        if(this.map.get(identifier)){
            return this.map.get(identifier);
        }

        return [];
    }

    /**
     * Return the type a variable is assigned on a given line. 
     * 
     * @returns the type of expression assigned to the variable on the given line. null if there is no assignment on that line.
     */
    getAssignedTypeOnLine(identifier: string, lineNumber: number): DataType{
        if(this.map.get(identifier)){       
            const record = this.getRecordByLineNumber(this.map.get(identifier), lineNumber);  
            return record ? record[1] : null;
        }
    }

    /**
     * Return the inferred data type of a variable on a given line.
     * 
     * @returns inferred data type of the variable on lineNumber. null otherwise.
     */
    getAssignedTypeNearLine(identifier: string, lineNumber: number, focus: Focus): DataType{
        if(this.map.get(identifier)){
            const record = this.getRecordByLineNumber(this.map.get(identifier), lineNumber);

            if(record){
                return record[1];
            }
            else{
                const records: [number, DataType][] = this.map.get(identifier);
                const recordLines = records.map(record => record[0]).filter(line => line <= lineNumber)

                if(recordLines.length === 0){//lineNumber is above all assignments to identifier
                    return null;
                }

                //find assignment closest to lineNumber
                let smallestDiffIndex = 0;
                for(let i = 0; i < recordLines.length; i++){
                    if(lineNumber - recordLines[i] < lineNumber - recordLines[smallestDiffIndex]){
                        smallestDiffIndex = i;
                    }
                }

                //determine type
                const record = records[smallestDiffIndex];
                const statementAtRefLine = focus.getStatementAtLineNumber(lineNumber);
                const assignemntStmt = focus.getStatementAtLineNumber(record[0]);

                if(statementAtRefLine.rootNode === assignemntStmt.rootNode){
                    return record[1];
                }
                else{
                    //find all assignments and their type above lineNumber
                    const types = records.filter(record => record[0] <= lineNumber).map(filteredRecord => filteredRecord[1]);
                    const firstType = types[0];

                    //if all types are equal, then it is safe to return that type
                    if(types.every(type => type === firstType)){
                        return firstType;
                    }
                    else{
                        return DataType.Any;
                    }
                }
            }
        }

        return null;
    }

    private getRecordByLineNumber(recordsList: [number, DataType][], lineNumber: number): [number, DataType]{
        for(const record of recordsList){
            if(record[0] === lineNumber){
                return record;
            }
        }

        return null;
    }

    private getRecordIndex(recordsList: [number, DataType][], lineNumber: number): number{
        for(let i = 0; i < recordsList.length; i++){
            if(recordsList[i][0] === lineNumber){
                return i
            }
        }

        return -1;
    }
}