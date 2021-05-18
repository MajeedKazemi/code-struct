
import {ErrorType} from "./notification-system-controller"

export enum ErrorMessage{
    default,
    outOfScopeVarReference,
    methodCallObjectTypeMismatch,
    binOpArgTypeMismatch,
    boolOpArgTypeMismatch,
    compOpArgTypeMismatch,
    methodArgTypeMismatch,
    addableTypeMismatch,
    addableTypeMismatchControlStmt,
    addableTypeMismatchVarAssignStmt,
}

enum CSSClasses{
    identifier = "identifier",
    type = "type",
    keyword = "keyword",
    other = "other"
}

export class ErrorMessageGenerator{
    constructor(){}

    /**
     * 
     * @param errMsgType  type of error to generate message for
     * @param args        context arguments for the error message. Error messages can require a variety of information;
     *                    below are the different values that this object should hold and the cases it should hold it in.
     * 
     * OutOfScopeVarReference:
     *      args.identifier: identifier that was referenced out of scope
     * 
     * MethodCallObjectTypeMismatch:
     *      args.objectType:     type of object the method was attempted to be called from
     *      args.method:         name of method that was called
     *      args.methodCalledOn: type of object from which this method can be called from
     * 
     * BinOpArgTypeMismatch:
     *      args.binOp: what algebraic binary operation was performed (+, -, /, *)
     *      args.argType1: type of first expression
     *      args.argType2: type of second expression
     * 
     * BoolOpArgTypeMismatch:
     *      args.binOp: what boolean binary operation was performed (and, or, not)
     *      args.argType1: type of expression that caused the error
     * 
     * CompOpArgTypeMismatch:
     *      args.binOp: what comparison binary operation was performed (==, <, >, <=, >=, !=)
     *      args.argType1: type of first expression
     *      args.argType2: type of second expression
     * 
     * MethodArgTypeMismatch:
     *      args.argType1: expected type of argument 
     *      args.argType2: actual type of argument
     * 
     * AddableTypeMismatch:
     * 
     * @returns  an appropriate error message for the given error and context
     */
    generateMsg(errMsgType: ErrorMessage, args: any) : string{
        let msg = ""

        switch(errMsgType){
            case ErrorMessage.outOfScopeVarReference:
                msg = `Attempted to reference ${this.getStyledSpan(args.identifier, CSSClasses.identifier)} 
                       before declaration. ${this.getStyledSpan(args.identifier, CSSClasses.identifier)}
                       either has not been defined or is defined after the current line.`
                break;
            case ErrorMessage.methodCallObjectTypeMismatch:
                msg = `Attempted to call ${this.getStyledSpan(args.method, CSSClasses.identifier)}() 
                       from an object of type ${this.getStyledSpan(args.objectType, CSSClasses.type)}.
                       It can only be called from objects of type ${this.getStyledSpan(args.objectType, CSSClasses.type)}.` 
                break;
            case ErrorMessage.binOpArgTypeMismatch:
                msg = `${this.getStyledSpan(args.binOp, CSSClasses.other)} is not defined for types
                        ${this.getStyledSpan(args.argType1, CSSClasses.type)} and ${this.getStyledSpan(args.argType2, CSSClasses.type)}.`
                break;
            case ErrorMessage.boolOpArgTypeMismatch:
                msg = `${this.getStyledSpan(args.binOp, CSSClasses.other)} only accepts expressions that evaluate to type 
                        ${this.getStyledSpan("Boolean", CSSClasses.type)} or ${this.getStyledSpan("Boolean", CSSClasses.type)} literas.
                        Attempted to insert ${this.getStyledSpan(args.argType1, CSSClasses.type)} instead.`
                break;
            case ErrorMessage.compOpArgTypeMismatch:
                msg = `${this.getStyledSpan(args.binOp, CSSClasses.other)} is not defined for types ${this.getStyledSpan(args.argType1, CSSClasses.type)}
                       and ${this.getStyledSpan(args.argType2, CSSClasses.type)}.`
                break;
            case ErrorMessage.methodArgTypeMismatch:
                msg = `Argument of type ${this.getStyledSpan(args.argType1, CSSClasses.type)} expected, but got ${this.getStyledSpan(args.argType2, CSSClasses.type)}.`
                break;
            //TODO: Need better formatting for the receives array here. Consider when it has more than one item and when it is completely empty.
            case ErrorMessage.addableTypeMismatchControlStmt:
                if(args.constructName != "for"){
                    msg = `${this.getStyledSpan(args.constructName, CSSClasses.keyword)} is a control flow statement. It only accepts boolean
                            expressions or method calls and literal values that evaluate to a boolean. Tried to insert a ${this.getStyledSpan(args.addedType, CSSClasses.keyword)} instead.`
                }
                else{ //TODO: This case needs to be further separated based on which part of the for we attempted to insert into
                    msg = `${this.getStyledSpan(args.constructName, CSSClasses.keyword)} is a control flow statement that iterates over a range of values.
                            It only accepts iterable objects. Tried to insert a ${this.getStyledSpan(args.addedType, CSSClasses.keyword)} instead.`
                }
                break;
            case ErrorMessage.addableTypeMismatchVarAssignStmt:
                msg = `${this.getStyledSpan(args.constructName, CSSClasses.keyword)} accepts only text for the variable name. Tried to insert a ${this.getStyledSpan(args.addedType, CSSClasses.keyword)} instead.`
                break;
            case ErrorMessage.addableTypeMismatch:
                msg = `${this.getStyledSpan(args.constructName, CSSClasses.keyword)} can only recieve the following types:
                        ${this.getStyledSpan(args.receivesTypes, CSSClasses.type)}. Found ${this.getStyledSpan(args.addableType, CSSClasses.type)} instead.`
                break;
            default:
                msg = "Invalid action."
                break;
        }

        return msg;
    }

    private getStyledSpan(content: string, styleClass: string) : string {
        return `<span class=${styleClass}>${content}</span>`;
    }

}
