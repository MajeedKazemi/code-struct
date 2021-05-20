
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
    addableTypeMismatchEmptyLine,
    existingIdentifier,
    identifierIsKeyword,
    identifierIsBuiltInFunc
}

enum CSSClasses{
    identifier = "identifier",
    type = "type",
    keyword = "keyword",
    other = "other"
}

const usePersonalizedMessages = false

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
     *      args.calledOn: type of object from which this method can be called from
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
     * AddableTypeMismatchControlStmt:
     *      
     * 
     * AddableTypeMismatchVarAssignStmt:
     *      args.contructName: object type that the user tried to insert into. In this case should always be 'Variable assignment'
     *      args.addedType:    type of object user tried to insert.
     * 
     * AddableTypeMismatchEmptyLine:
     *      args.addedType: type of object user tried to add.
     * 
     * ExistingIdentifier:
     *      args.identifier: identifier that the user tried to use.
     * 
     * IdentifierIsKeyword:
     *      args.identifier: identifier that the user tried to use.
     * 
     * IdentifierIsBuiltInFunc:
     *      args.identifier: identifier that the user tried to use.
     * 
     * @returns  an appropriate error message for the given error and context
     */
    generateMsg(errMsgType: ErrorMessage, args: any) : string{
        switch(errMsgType){
            case ErrorMessage.outOfScopeVarReference:
                if(usePersonalizedMessages){
                    return `I don't know what ${this.getStyledSpan(args.identifier, CSSClasses.identifier)} is. This could be because it has not been declared or it is declared on a line below this one.
                            Please let me know what ${this.getStyledSpan(args.identifier, CSSClasses.identifier)}
                            is by declaring it and then I'll know how it can be used.`;
                }
                
                return `Attempted to reference ${this.getStyledSpan(args.identifier, CSSClasses.identifier)} 
                       before declaration. ${this.getStyledSpan(args.identifier, CSSClasses.identifier)}
                       either has not been defined or is defined after the current line.`;
                
            case ErrorMessage.methodCallObjectTypeMismatch:
                if(usePersonalizedMessages){
                    return `I don't know how to do ${this.getStyledSpan(args.method, CSSClasses.identifier)}() from an
                            object of type ${this.getStyledSpan(args.calledOn, CSSClasses.type)}. I can only call it from objects of type 
                            ${this.getStyledSpan(args.calledOn, CSSClasses.type)}.`;
                }

                return `Attempted to call ${this.getStyledSpan(args.method, CSSClasses.identifier)}() 
                       from an object of type ${this.getStyledSpan(args.objectType, CSSClasses.type)}.
                       It can only be called from objects of type ${this.getStyledSpan(args.calledOn, CSSClasses.type)}.`;

            case ErrorMessage.binOpArgTypeMismatch:
                if(usePersonalizedMessages){
                    return `I can only perform ${this.getStyledSpan(args.binOp, CSSClasses.other)} for like types. I cannot perform it on two different types
                    such as ${this.getStyledSpan(args.argType1, CSSClasses.type)} and ${this.getStyledSpan(args.argType2, CSSClasses.type)}.`;
                }

                return `${this.getStyledSpan(args.binOp, CSSClasses.other)} is not defined for types
                        ${this.getStyledSpan(args.argType1, CSSClasses.type)} and ${this.getStyledSpan(args.argType2, CSSClasses.type)}.`;

            case ErrorMessage.boolOpArgTypeMismatch:
                if(usePersonalizedMessages){
                    `I cannot perform  ${this.getStyledSpan(args.binOp, CSSClasses.other)} on an expression of type ${this.getStyledSpan(args.argType1, CSSClasses.type)}.
                     I can only perform ${this.getStyledSpan(args.binOp, CSSClasses.other)} on ${this.getStyledSpan("Boolean", CSSClasses.type)} literals, 
                     variables or expressions.`;
                }
                
                return `${this.getStyledSpan(args.binOp, CSSClasses.other)} only accepts expressions that evaluate to type 
                        ${this.getStyledSpan("Boolean", CSSClasses.type)} or ${this.getStyledSpan("Boolean", CSSClasses.type)} literals.
                        Attempted to insert ${this.getStyledSpan(args.argType1, CSSClasses.type)} instead.`;

            case ErrorMessage.compOpArgTypeMismatch:
                if(usePersonalizedMessages){
                    return `I cannot perform the comparison ${this.getStyledSpan(args.binOp, CSSClasses.other)} on different types such as 
                    ${this.getStyledSpan(args.argType1, CSSClasses.type)} and ${this.getStyledSpan(args.argType2, CSSClasses.type)}. They have to be the same type.`;
                }

                return `${this.getStyledSpan(args.binOp, CSSClasses.other)} is not defined for types ${this.getStyledSpan(args.argType1, CSSClasses.type)}
                       and ${this.getStyledSpan(args.argType2, CSSClasses.type)}.`;

            case ErrorMessage.methodArgTypeMismatch:
                if(usePersonalizedMessages){
                    //TODO: Add method name to args and change generated message accordingly.
                    return `The argument to ${this.getStyledSpan(args.argType1, CSSClasses.type)} should be of type 
                            ${this.getStyledSpan(args.argType1, CSSClasses.type)}, but I found a ${this.getStyledSpan(args.argType2, CSSClasses.type)}.`;
                }

                return `Argument of type ${this.getStyledSpan(args.argType1, CSSClasses.type)} expected, 
                        but got ${this.getStyledSpan(args.argType2, CSSClasses.type)}.`;

            case ErrorMessage.addableTypeMismatchControlStmt:
                if(usePersonalizedMessages){
                    if(args.constructName != "for"){
                        return `${this.getStyledSpan(args.constructName, CSSClasses.keyword)} is a control flow statement.
                                I can only put ${this.getStyledSpan("Boolean", CSSClasses.type)} expressions or anything else that evaluates 
                                to a ${this.getStyledSpan("Boolean", CSSClasses.type)} value.`;
                    }
                    else{ //TODO: This case needs to be further separated based on which part of the for we attempted to insert into
                        return `${this.getStyledSpan(args.constructName, CSSClasses.keyword)} is a control flow statement that I can only put a range
                                of values into. So I can use a list, string or a range of numbers here, but not ${this.getStyledSpan(args.addedType, CSSClasses.keyword)}.`;
                    }
                }

                if(args.constructName != "for"){
                    return `${this.getStyledSpan(args.constructName, CSSClasses.keyword)} is a control flow statement. It only accepts ${this.getStyledSpan(args.constructName, CSSClasses.keyword)}
                            expressions or method calls and literal values that evaluate to a ${this.getStyledSpan(args.constructName, CSSClasses.keyword)}. Tried to insert a ${this.getStyledSpan(args.addedType, CSSClasses.keyword)} instead.`
                }
                else{ //TODO: This case needs to be further separated based on which part of the for we attempted to insert into
                    return `${this.getStyledSpan(args.constructName, CSSClasses.keyword)} is a control flow statement that iterates over a range of values.
                            It only accepts iterable objects. Tried to insert a ${this.getStyledSpan(args.addedType, CSSClasses.keyword)} instead.`
                }
                
            case ErrorMessage.addableTypeMismatchVarAssignStmt:
                if(usePersonalizedMessages){
                    return `I can only create variables with text for a variable name, but I received a 
                    ${this.getStyledSpan(args.addedType, CSSClasses.keyword)}.`;
                }

                return `${this.getStyledSpan(args.constructName, CSSClasses.keyword)} accepts only text for the variable name. Tried to insert a
                        ${this.getStyledSpan(args.addedType, CSSClasses.keyword)} instead.`;
            
            case ErrorMessage.addableTypeMismatchEmptyLine:
                if(usePersonalizedMessages){
                    return `I cannot insert a(n) ${this.getStyledSpan(args.addedType, CSSClasses.keyword)} on an empty line.`;
                }

                return `Cannot insert a(n) ${this.getStyledSpan(args.addedType, CSSClasses.keyword)} on an empty line.`;

            case ErrorMessage.existingIdentifier:
                if(usePersonalizedMessages){
                    return `I am already using ${this.getStyledSpan(args.identifier, CSSClasses.identifier)} somewhere else. Please choose a different name.`;
                }
                
                return `The identifier ${this.getStyledSpan(args.identifier, CSSClasses.identifier)} is already in use in this scope.`;

            case ErrorMessage.identifierIsKeyword:
                if(usePersonalizedMessages){
                    return `${this.getStyledSpan(args.identifier, CSSClasses.identifier)} is a special keyword that I am not allowed to use as a name for a variable.
                            Please try a different one.`;
                }

                return `The identifier ${this.getStyledSpan(args.identifier, CSSClasses.identifier)} is a reserved keyword. Please use a different one.`;
            case ErrorMessage.identifierIsBuiltInFunc:
                if(usePersonalizedMessages){
                    return `I am already using ${this.getStyledSpan(args.identifier, CSSClasses.identifier)} as a name for a built-in function and it would
                            be difficult for me to keep track of another ${this.getStyledSpan(args.identifier, CSSClasses.identifier)}. Please choose a different name.`;
                }

                return `The identifier ${this.getStyledSpan(args.identifier, CSSClasses.identifier)} is the name of a built-in function or variable.
                        Please use a different one.`;

            default:
                if(usePersonalizedMessages){
                    return "I cannot do that here.";
                }

                return "Invalid action.";
        }
    }

    private getStyledSpan(content: string, styleClass: string) : string {
        return `<span class=${styleClass}>${content}</span>`;
    }
}
