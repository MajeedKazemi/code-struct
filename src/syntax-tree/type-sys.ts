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
     * Validates wether insertionCode can be inserted into the second hole of a for-loop/
     * 
     * @param insertionCode expression to be inserted
     * @returns T/F based on whether the insertion is allowed or not
     */
    validateForLoopIterableInsertion(insertionCode: Expression){
        return [DataType.AnyList, DataType.StringList, DataType.NumberList, DataType.BooleanList, DataType.String].indexOf(insertionCode.returns) > -1
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
    updateForLoopVarType(forLoop: ForStatement, code: Expression){
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