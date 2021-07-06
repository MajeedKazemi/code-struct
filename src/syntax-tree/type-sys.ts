import { ErrorMessage } from "../notification-system/error-msg-generator";
import { BinaryOperatorExpr, CodeConstruct, DataType, Expression, ForStatement, Module, Statement, TypedEmptyExpr, VarAssignmentStmt } from "./ast";


export class TypeSystem{
    static varTypeMap: Map<string, DataType>;
    static listTypes;

    module: Module;

    constructor(module: Module){
        if(!TypeSystem.varTypeMap){
            TypeSystem.varTypeMap = new Map<string, DataType>();
            TypeSystem.listTypes = [DataType.AnyList, DataType.StringList, DataType.NumberList, DataType.BooleanList, DataType.String]
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
    validateForLoopIterableInsertionType(insertionCode: Expression){
        return TypeSystem.listTypes.indexOf(insertionCode.returns) > -1
    }

    /**
     * Set all empty holes (TypedEmptyExpr) in an expression to the provided type newTypes.
     * 
     * @param parentConstruct parent Statement of the expression
     * @param newTypes        types to use
     */
    setAllHolesToType(parentConstruct: Statement, newTypes: DataType[]){
        for(const tkn of parentConstruct.tokens){
            if(tkn instanceof BinaryOperatorExpr){
                this.setAllHolesToType(tkn, newTypes);
            }
            else if(tkn instanceof TypedEmptyExpr){
                tkn.type = newTypes;
            }
        }
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
        const newType = this.getElementTypeFromListType(code.returns);
        TypeSystem.varTypeMap.set(forLoop.getIdentifier(), newType);
        this.updateDataTypeOfVarRefInToolbox(forLoop.loopVar, newType);

        console.log(newType)
    }

    /**
     * Return the corresponding type of list given the type of element.
     * 
     * @param type element type
     * @returns    corresponding list type (one of: StringList, NumberList, BooleanList, AnyList)
     */
    getListTypeFromElementType(type: DataType){
        switch(type){
            case DataType.String:
                return DataType.StringList
            case DataType.Number:
                return DataType.NumberList
            case DataType.Boolean:
                return DataType.BooleanList
            default:
                return DataType.AnyList
        }
    }

    /**
     * Deduce element type from list type and return it.
     * 
     * @param listType type of list
     * @returns type of elements contained in listType
     */
    getElementTypeFromListType(listType: DataType){
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