import { DataType, Module, VarAssignmentStmt } from "./ast";


export class TypeSystem{
    static varTypeMap: Map<string, DataType>;

    module: Module;

    constructor(module: Module){
        if(!TypeSystem.varTypeMap){
            TypeSystem.varTypeMap = new Map<string, DataType>();
        }

        this.module = module;
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
}