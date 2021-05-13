
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
                msg = `Attempted to reference ${args.var1} out of scope.`
            default:
                msg = "Invalid action."
        }

        return msg;
    }


}


//NOTE: template literal tags might be helpful here later