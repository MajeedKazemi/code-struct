import { ErrorMessage } from "../notification-system/error-msg-generator";
import { DataType, Expression, ForStatement, Module, Statement, TypedEmptyExpr, VarAssignmentStmt } from "./ast";


export class TypeSystem{
    static varTypeMap: Map<string, DataType>;

    module: Module;

    constructor(module: Module){
        if(!TypeSystem.varTypeMap){
            TypeSystem.varTypeMap = new Map<string, DataType>();
        }

        this.module = module;
    }

    /**
     * Replaces the record using an old identifier of a variable with a record using the new identifier.
     * 
     * @param oldIdentifier the variable's old identifier
     * @param newIdentifier the variable's new identifier
     */
    static updateVarIdentifierInMap(oldIdentifier: string, newIdentifier: string){
        const currentType = this.varTypeMap.get(oldIdentifier);
        this.varTypeMap.delete(oldIdentifier);
        this.varTypeMap.set(newIdentifier, currentType);
    }

    /**
     * Verifies that insertionCode is a valid insertion into insertInto when insertInto's parent is a ForStatement. 
     * Optionally updates the type of insertInto's parent's counter variable to be the type of insertionCode.returns
     * when updateType is true.
     * 
     * 
     * @param insertionCode code to check the type against
     * @param insertInto    the second hole of a for-loop
     * @param updateType    T/F based on whether a type updated is required
     * @returns true if insertionCode can be inserted into insertInto, false otherwise.
     */
    checkForLoopIterableType(insertionCode: Expression, insertInto: TypedEmptyExpr, updateType: boolean = false){
        const parentStatement = insertInto.rootNode as ForStatement;

        if (insertionCode.returns != DataType.AnyList && insertionCode.returns != DataType.StringList && insertionCode.returns != DataType.NumberList && insertionCode.returns != DataType.BooleanList && insertionCode.returns != DataType.String) {
            //TODO: Notif message needs to be fixed to contain every type
            this.module.notificationSystem.addHoverNotification(
                insertInto,
                {
                    addedType: insertionCode.returns,
                    constructName: parentStatement.getKeyword(),
                    expectedType: insertInto.type,
                },
                ErrorMessage.exprTypeMismatch
            );

            return false;
        }

        if(updateType){
            this.updateForLoopVarType(parentStatement, insertionCode);
        }

        return true;
    }


    /**
     * Update the toolbox button associated with a variable to create a reference of a new type.
     * 
     * @param code    variable assignment statement of the variable to be updated
     * @param newType type to be used
     */
    updateDataTypeOfVarRefInToolbox(code: VarAssignmentStmt, newType: DataType){
        const button = document.getElementById(code.buttonId);
        button.removeEventListener("click", this.module.getVarRefHandler(code), false);

        code.dataType = newType;
        TypeSystem.varTypeMap.set(code.getIdentifier(), newType);

        button.addEventListener(
            "click",
            this.module.getVarRefHandler(code).bind(this.module)
        );
    }

    /**
     * Updates a for loop's counter variable's type to code's type.
     * 
     * @param forLoop for loop statement
     * @param code    expression the type of which will be used
     */
    private updateForLoopVarType(forLoop: ForStatement, code: Expression){
        const newType = this.getListElementType(code.returns);
        TypeSystem.varTypeMap.set(forLoop.getIdentifier(), newType);
        this.updateDataTypeOfVarRefInToolbox(forLoop.loopVar, newType);
    }

    /**
     * Deduce element type from list type and return it.
     * 
     * @param listType type of list
     * @returns type of elements contained in listType
     */
    private getListElementType(listType: DataType){
        switch(listType){
            case DataType.AnyList:
                return DataType.Any
            case DataType.StringList:
                return DataType.String
            case DataType.BooleanList:
                return DataType.Boolean
            case DataType.NumberList:
                return DataType.Number
            default:
                return DataType.Any
        } 
    }
}