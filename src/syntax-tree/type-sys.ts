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

    static updateVarTypeInMap(oldIdentifier: string, newIdentifier: string){
        const currentType = this.varTypeMap.get(oldIdentifier);
        this.varTypeMap.delete(oldIdentifier);
        this.varTypeMap.set(newIdentifier, currentType);
    }

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

    updateDataTypeOfVarRefInToolbox(code: VarAssignmentStmt, newType: DataType, toolboxAction: Function){
        const button = document.getElementById(code.buttonId);
        button.removeEventListener("click", toolboxAction(code), false);

        code.dataType = newType;
        TypeSystem.varTypeMap.set(code.getIdentifier(), newType);

        button.addEventListener(
            "click",
            toolboxAction(code).bind(this.module)
        );
    }

    private updateForLoopVarType(forLoop: ForStatement, code: Expression){
        const newType = this.getListElementType(code.returns);
        TypeSystem.varTypeMap.set(forLoop.getIdentifier(), newType);
        this.updateDataTypeOfVarRefInToolbox(forLoop.loopVar, newType, this.module.getVarRefHandler);
    }

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