import { BinaryOperatorExpr, CodeConstruct, Expression, TypedEmptyExpr } from "./ast";
import { DataType, TypeConversionRecord, typeToConversionRecord } from "./consts";
import { Module } from "./module";

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
            case DataType.String:
                return DataType.String;

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

    //get conversion records for a construct of type convertFrom to type convertTo
    static getTypeConversionRecords(convertFrom: DataType, convertTo: DataType): TypeConversionRecord[] {
        if (typeToConversionRecord.has(convertFrom)) {
            return typeToConversionRecord.get(convertFrom).filter((record) => record.convertTo === convertTo);
        }

        return [];
    }

    //get all conversion buttons for a particular construct given its conversion records for each type
    static getConversionButtons(
        conversionRecords: TypeConversionRecord[],
        module: Module,
        itemToConvertKeyword: string,
        codeToReplaceOnConversion: CodeConstruct
    ) {
        if (conversionRecords.length === 0) return [];

        const buttons = [];
        for (const record of conversionRecords) {
            buttons.push(record.getConversionButton(itemToConvertKeyword, module, codeToReplaceOnConversion));
        }

        return buttons;
    }
}
