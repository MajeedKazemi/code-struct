
import {ErrorType} from "./notification-system-controller"

export enum ErrorMessage{
    default,
    outOfScopeVarReference

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
        switch(errMsgType){
            case ErrorMessage.outOfScopeVarReference:
                msg = `Attempted to reference "${args.identifier}" out of scope.`
                break;
            default:
                msg = "Invalid action."
                break;
        }

        return msg;
    }


}


//NOTE: template literal tags might be helpful here later