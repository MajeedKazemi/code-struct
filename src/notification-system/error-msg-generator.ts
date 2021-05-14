
import {ErrorType} from "./notification-system-controller"

export enum ErrorMessage{
    default,
    outOfScopeVarReference,
    methodCallObjectTypeMismatch,
    binOpArgTypeMismatch,
    boolOpArgTypeMismatch,
    compOpArgTypeMismatch
}



export class ErrorMessageGenerator{
    constructor(){}

    /**
     * 
     * @param errMsgType 
     * @param args 
     * 
     * 
     * 
     * 
     * 
     * 
     * 
     * 
     * 
     * 
     * 
     * @returns 
     */
    generateMsg(errMsgType: ErrorMessage, args: any) : string{
        let msg = ""

        //TODO: This is not exactly good design for the args parameter, but it is too varied on what it needs to contain. Include documentation on how its memebrs are used in diff errors.
        switch(errMsgType){
            case ErrorMessage.outOfScopeVarReference:
                msg = `Attempted to reference "${args.identifier}" out of scope.`
                break;
            case ErrorMessage.methodCallObjectTypeMismatch:
                msg = `Attempted to call method from object that does not support it. Object type: ${args.objectType} \n Method: ${args.method} \n Called On: ${args.methodCalledOn}`
                break;
            case ErrorMessage.binOpArgTypeMismatch:
                    msg = `${args.binOp} is not defined for types ${args.argType1} and ${args.argType2}.`
                    break;
            case ErrorMessage.boolOpArgTypeMismatch:
                    msg = `${args.binOp} only accepts expressions that evaluate to type bool or bool literas. Attempted to insert ${args.argsType1}.`
                    break;
            case ErrorMessage.compOpArgTypeMismatch:
                msg = `${args.binOp} is not defined for types ${args.argType1} and ${args.argType2}.`
                break;
            default:
                msg = "Invalid action."
                break;
        }

        return msg;
    }


}


//NOTE: template literal tags might be helpful here later