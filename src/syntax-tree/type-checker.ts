import { Module } from "./module";
import { DataType } from "./consts";
import { BinaryOperatorExpr, Expression, ForStatement, TypedEmptyExpr, VarAssignmentStmt } from "./ast";

export class TypeChecker {
    static varTypeMap: Map<string, DataType> = new Map<string, DataType>();
    static listTypes: Array<DataType>;

    module: Module;

    constructor(module: Module) {
        if (!TypeChecker.listTypes) {
            //it does not recognize the imports unless they are assigned inside the constructor
            TypeChecker.listTypes = [
                DataType.AnyList,
                DataType.StringList,
                DataType.NumberList,
                DataType.BooleanList,
                DataType.String,
            ];
        }

        this.module = module;
    }

    /**
     * Validates wether insertionCode can be inserted into the second hole of a for-loop/
     *
     * @param insertionCode expression to be inserted
     * @returns T/F based on whether the insertion is allowed or not
     */
    validateForLoopIterableInsertionType(insertionCode: Expression) {
        return TypeChecker.listTypes.indexOf(insertionCode.returns) > -1;
    }

    /**
     * Recursively set all empty holes (TypedEmptyExpr) in an expression to the provided type newTypes.
     *
     * @param parentConstruct parent Statement of the expression
     * @param newTypes        types to use
     */
    static setAllHolesToType(parentConstruct: Expression, newTypes: DataType[], setParentType: boolean = false) {
        if (setParentType) parentConstruct.returns = newTypes[0];

        for (const tkn of parentConstruct.tokens) {
            if (tkn instanceof BinaryOperatorExpr) {
                this.setAllHolesToType(tkn, newTypes);
            } else if (tkn instanceof TypedEmptyExpr) {
                tkn.type = newTypes;
            }
        }
    }

    /**
     * Return the corresponding type of list given the type of element.
     *
     * @param type element type
     * @returns    corresponding list type (one of: StringList, NumberList, BooleanList, AnyList)
     */
    static getListTypeFromElementType(type: DataType) {
        switch (type) {
            case DataType.String:
                return DataType.StringList;
            case DataType.Number:
                return DataType.NumberList;
            case DataType.Boolean:
                return DataType.BooleanList;
            default:
                return DataType.AnyList;
        }
    }

    /**
     * Deduce element type from list type and return it.
     *
     * @param listType type of list
     * @returns type of elements contained in listType
     */
    static getElementTypeFromListType(listType: DataType) {
        switch (listType) {
            case DataType.AnyList:
                return DataType.Any;
            case DataType.StringList:
                return DataType.String;
            case DataType.BooleanList:
                return DataType.Boolean;
            case DataType.NumberList:
                return DataType.Number;
            default:
                return DataType.Any;
        }
    }

    //Variables need to get refactored anyway so might not need this for now

    /**
     * Replaces the record using an old identifier of a variable with a record using the new identifier.
     *
     * @param oldIdentifier the variable's old identifier
     * @param newIdentifier the variable's new identifier
     */
    static updateVarIdentifierInMap(oldIdentifier: string, newIdentifier: string) {
        const currentType = this.varTypeMap.get(oldIdentifier);
        this.varTypeMap.delete(oldIdentifier);
        this.varTypeMap.set(newIdentifier, currentType);
    }
}
