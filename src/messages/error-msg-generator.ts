import { IdentifierTkn, TypedEmptyExpr } from "../syntax-tree/ast";
import { CSSClasses, TextEnhance } from "../utilities/text-enhance";

export enum ErrorMessage {
    default,
    outOfScopeVarReference,
    methodCallObjectTypeMismatch,
    binOpArgTypeMismatch,
    boolOpArgTypeMismatch,
    compOpArgTypeMismatch,
    methodArgTypeMismatch,
    addableTypeMismatchGeneral,
    addableTypeMismatchControlStmt,
    addableTypeMismatchVarAssignStmt,
    addableTypeMismatchEmptyLine,
    existingIdentifier,
    identifierIsKeyword,
    identifierIsBuiltInFunc,
    exprTypeMismatch,
    addableTypeMismatchMethodArg,
    addableTypeMismatchOperator,
}

const usePersonalizedMessages = false;

export class ErrorMessageGenerator {
    private textEnhancer: TextEnhance;

    constructor() {
        this.textEnhancer = new TextEnhance();
    }

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
     *      args.binOp: what boolean operation was performed (and, or)
     *      args.argType1: type of first expression
     *      args.argType2: type of second expression
     *
     * CompOpArgTypeMismatch:
     *      args.binOp: what comparison binary operation was performed (==, <, >, <=, >=, !=)
     *      args.argType1: type of first expression
     *      args.argType2: type of second expression
     *
     * MethodArgTypeMismatch:
     *      args.argType1:   expected type of argument
     *      args.argType2:   actual type of argument
     *      args.methodName: name of method
     *
     * AddableTypeMismatchControlStmt:
     *      args.constructName: name of control flow construct
     *      args.addedType:     type of object the user attempted to add
     *      args.focusedNode:   the module's focused node
     *
     * AddableTypeMismatchVarAssignStmt:
     *      args.contructName: object type that the user tried to insert into. In this case should always be 'Variable assignment'
     *      args.addedType:    type of object user tried to insert
     *
     * AddableTypeMismatchEmptyLine:
     *      args.addedType: type of object user tried to add
     *
     * ExistingIdentifier:
     *      args.identifier: identifier that the user tried to us
     *
     * IdentifierIsKeyword:
     *      args.identifier: identifier that the user tried to use
     *
     * IdentifierIsBuiltInFunc:
     *      args.identifier: identifier that the user tried to use
     *
     * ExprTypeMismatchBoolean:
     *      args.addedType:     type of object user tried to add
     *      args.constructName: name of control flow construct. In this case should be one of: While, If, Else If
     *      args.expectedType:  type that was expected by expression
     *
     * AddableTypeMismatchMethodArg:
     *      args.addedType:     type of code construct that was attempted to be added
     *
     * AddableTypeMismatchGeneral:
     *      args.addedType:     type of code construct that was attempted to be added
     *
     * @returns  an appropriate error message for the given error and context
     */
    generateMsg(errMsgType: ErrorMessage, args: any): string {
        switch (errMsgType) {
            case ErrorMessage.outOfScopeVarReference:
                if (usePersonalizedMessages) {
                    return `I don't know what ${this.textEnhancer.getStyledSpan(
                        args.identifier,
                        CSSClasses.identifier
                    )} is. This could be because it has not been declared or it is declared on a line below this one.
                            Please let me know what ${this.textEnhancer.getStyledSpan(
                                args.identifier,
                                CSSClasses.identifier
                            )}
                            is by declaring it and then I'll know how it can be used.`;
                }

                return `Attempted to reference ${this.textEnhancer.getStyledSpan(
                    args.identifier,
                    CSSClasses.identifier
                )} 
                       before declaration. ${this.textEnhancer.getStyledSpan(args.identifier, CSSClasses.identifier)}
                       either has not been defined or is defined after the current line.`;

            case ErrorMessage.methodCallObjectTypeMismatch:
                if (usePersonalizedMessages) {
                    return `I don't know how to do ${this.textEnhancer.getStyledSpan(
                        args.method,
                        CSSClasses.identifier
                    )}() from an
                            object of type ${this.textEnhancer.getStyledSpan(
                                args.calledOn,
                                CSSClasses.type
                            )}. I can only call it from objects of type 
                            ${this.textEnhancer.getStyledSpan(args.calledOn, CSSClasses.type)}.`;
                }

                return `Attempted to call ${this.textEnhancer.getStyledSpan(args.method, CSSClasses.identifier)}() 
                       from an object of type ${this.textEnhancer.getStyledSpan(args.objectType, CSSClasses.type)}.
                       It can only be called from objects of type ${this.textEnhancer.getStyledSpan(
                           args.calledOn,
                           CSSClasses.type
                       )}.`;

            //The next three use the same text and args, but are kept separate in case we want to adjust their text individually
            case ErrorMessage.binOpArgTypeMismatch:
                if (usePersonalizedMessages) {
                    return `I can only perform ${this.textEnhancer.getStyledSpan(
                        args.binOp,
                        CSSClasses.other
                    )} for like types. I cannot perform it on two different types
                    such as ${this.textEnhancer.getStyledSpan(
                        args.argType1,
                        CSSClasses.type
                    )} and ${this.textEnhancer.getStyledSpan(args.argType2, CSSClasses.type)}.`;
                }

                return `${this.textEnhancer.getStyledSpan(args.binOp, CSSClasses.other)} is not defined for types
                        ${this.textEnhancer.getStyledSpan(
                            args.argType1,
                            CSSClasses.type
                        )} and ${this.textEnhancer.getStyledSpan(args.argType2, CSSClasses.type)}.`;

            case ErrorMessage.boolOpArgTypeMismatch:
                if (usePersonalizedMessages) {
                    `I cannot perform  ${this.textEnhancer.getStyledSpan(
                        args.binOp,
                        CSSClasses.other
                    )} on an expression of type ${this.textEnhancer.getStyledSpan(args.argType2, CSSClasses.type)}.
                     I can only perform ${this.textEnhancer.getStyledSpan(
                         args.binOp,
                         CSSClasses.other
                     )} on ${this.textEnhancer.getStyledSpan(args.argType1, CSSClasses.type)} literals, 
                     variables or expressions.`;
                }

                return `${this.textEnhancer.getStyledSpan(args.binOp, CSSClasses.other)} is not defined for types
                        ${this.textEnhancer.getStyledSpan(
                            args.argType1,
                            CSSClasses.type
                        )} and ${this.textEnhancer.getStyledSpan(args.argType2, CSSClasses.type)}.`;

            case ErrorMessage.compOpArgTypeMismatch:
                if (usePersonalizedMessages) {
                    return `I cannot perform the comparison ${this.textEnhancer.getStyledSpan(
                        args.binOp,
                        CSSClasses.other
                    )} on different types such as 
                    ${this.textEnhancer.getStyledSpan(
                        args.argType1,
                        CSSClasses.type
                    )} and ${this.textEnhancer.getStyledSpan(
                        args.argType2,
                        CSSClasses.type
                    )}. They have to be the same type.`;
                }

                return `${this.textEnhancer.getStyledSpan(
                    args.binOp,
                    CSSClasses.other
                )} is not defined for types ${this.textEnhancer.getStyledSpan(args.argType1, CSSClasses.type)}
                       and ${this.textEnhancer.getStyledSpan(args.argType2, CSSClasses.type)}.`;

            case ErrorMessage.methodArgTypeMismatch:
                if (usePersonalizedMessages) {
                    return `This argument to ${this.textEnhancer.getStyledSpan(
                        args.methodName,
                        CSSClasses.identifier
                    )} should be of type 
                            ${this.textEnhancer.getStyledSpan(
                                args.argType1,
                                CSSClasses.type
                            )}, but I found a ${this.textEnhancer.getStyledSpan(args.argType2, CSSClasses.type)}.`;
                }

                return `Argument of type ${this.textEnhancer.getStyledSpan(args.argType1, CSSClasses.type)} expected, 
                        but got ${this.textEnhancer.getStyledSpan(args.argType2, CSSClasses.type)}.`;

            case ErrorMessage.addableTypeMismatchControlStmt:
                if (usePersonalizedMessages) {
                    if (args.constructName != "for") {
                        return `${this.textEnhancer.getStyledSpan(
                            args.constructName,
                            CSSClasses.keyword
                        )} is a control flow statement.
                                I can only put ${this.textEnhancer.getStyledSpan(
                                    "Boolean",
                                    CSSClasses.type
                                )} expressions or anything else that evaluates 
                                to a ${this.textEnhancer.getStyledSpan("Boolean", CSSClasses.type)} value.`;
                    } else {
                        if (args.focusedNode instanceof IdentifierTkn) {
                            return `${this.textEnhancer.getStyledSpan(
                                args.constructName,
                                CSSClasses.keyword
                            )} is a control flow statement that I can only put a range
                                of values into. For this particular hole I should be using a variable name that is used to represent an element of the reange I am looping over.`;
                        }
                    }
                }

                if (args.constructName != "for") {
                    return `${this.textEnhancer.getStyledSpan(
                        args.constructName,
                        CSSClasses.keyword
                    )} is a control flow statement. It only accepts ${this.textEnhancer.getStyledSpan(
                        "Boolean",
                        CSSClasses.type
                    )}
                            expressions or method calls and literal values that evaluate to a ${this.textEnhancer.getStyledSpan(
                                "Boolean",
                                CSSClasses.type
                            )}. Tried to insert a ${this.textEnhancer.getStyledSpan(
                        args.addedType,
                        CSSClasses.type
                    )} instead.`;
                } else {
                    if (args.focusedNode instanceof IdentifierTkn) {
                        return `Identifier expected. ${this.textEnhancer.getStyledSpan(
                            args.addedType,
                            CSSClasses.type
                        )} found instead.`;
                    } else if (args.focusedNode instanceof TypedEmptyExpr) {
                        return `Iterable object expected. ${this.textEnhancer.getStyledSpan(
                            args.addedType,
                            CSSClasses.type
                        )} found instead.`;
                    }

                    break;
                }

            case ErrorMessage.addableTypeMismatchVarAssignStmt:
                if (usePersonalizedMessages) {
                    return `I can only create variables with text for a variable name, but I received a 
                    ${this.textEnhancer.getStyledSpan(args.addedType, CSSClasses.keyword)}.`;
                }

                return `${this.textEnhancer.getStyledSpan(
                    args.constructName,
                    CSSClasses.keyword
                )} accepts only text for the variable name. Tried to insert a
                        ${this.textEnhancer.getStyledSpan(args.addedType, CSSClasses.keyword)} instead.`;

            case ErrorMessage.addableTypeMismatchEmptyLine:
                if (usePersonalizedMessages) {
                    return `I cannot insert a(n) ${this.textEnhancer.getStyledSpan(
                        args.addedType,
                        CSSClasses.keyword
                    )} on an empty line.`;
                }

                return `Cannot insert a(n) ${this.textEnhancer.getStyledSpan(
                    args.addedType,
                    CSSClasses.keyword
                )} on an empty line.`;

            case ErrorMessage.existingIdentifier:
                if (usePersonalizedMessages) {
                    return `I am already using ${this.textEnhancer.getStyledSpan(
                        args.identifier,
                        CSSClasses.identifier
                    )} somewhere else. Please choose a different name.`;
                }

                return `The identifier ${this.textEnhancer.getStyledSpan(
                    args.identifier,
                    CSSClasses.identifier
                )} is already in use in this scope.`;

            case ErrorMessage.identifierIsKeyword:
                if (usePersonalizedMessages) {
                    return `${this.textEnhancer.getStyledSpan(
                        args.identifier,
                        CSSClasses.identifier
                    )} is a special keyword that I am not allowed to use as a name for a variable.
                            Please try a different one.`;
                }

                return `The identifier ${this.textEnhancer.getStyledSpan(
                    args.identifier,
                    CSSClasses.identifier
                )} is a reserved keyword. Please use a different one.`;
            case ErrorMessage.identifierIsBuiltInFunc:
                if (usePersonalizedMessages) {
                    return `I am already using ${this.textEnhancer.getStyledSpan(
                        args.identifier,
                        CSSClasses.identifier
                    )} as a name for a built-in function and it would
                            be difficult for me to keep track of another ${this.textEnhancer.getStyledSpan(
                                args.identifier,
                                CSSClasses.identifier
                            )}. Please choose a different name.`;
                }

                return `The identifier ${this.textEnhancer.getStyledSpan(
                    args.identifier,
                    CSSClasses.identifier
                )} is the name of a built-in function or variable.
                        Please use a different one.`;

            case ErrorMessage.exprTypeMismatch:
                if (usePersonalizedMessages) {
                    return `I can only use ${this.textEnhancer.getStyledSpan(
                        args.expectedType,
                        CSSClasses.type
                    )} expressions here, but I found a
                            ${this.textEnhancer.getStyledSpan(args.addedType, CSSClasses.type)} instead.`;
                }

                return `A(n) ${this.textEnhancer.getStyledSpan(
                    args.constructName,
                    CSSClasses.keyword
                )} statement only accepts ${this.textEnhancer.getStyledSpan(args.expectedType, CSSClasses.type)}
                        expressions. Found ${this.textEnhancer.getStyledSpan(
                            args.addedType,
                            CSSClasses.type
                        )} instead.`;

            case ErrorMessage.addableTypeMismatchMethodArg:
                if (usePersonalizedMessages) {
                    return `I cannot give ${this.textEnhancer.getStyledSpan(
                        args.addedType,
                        CSSClasses.type
                    )} to methods as they don't know how to work with it.`;
                }

                return `${this.textEnhancer.getStyledSpan(
                    args.addedType,
                    CSSClasses.type
                )} cannot be used as a method argument.`;

            case ErrorMessage.addableTypeMismatchGeneral:
                if (usePersonalizedMessages) {
                    return `I cannot insert a(n) ${this.textEnhancer.getStyledSpan(
                        args.addedType,
                        CSSClasses.type
                    )} here.`;
                }

                return `A(n) ${this.textEnhancer.getStyledSpan(
                    args.addedType,
                    CSSClasses.type
                )} cannot be inserted at this location.`;

            default:
                if (usePersonalizedMessages) return "I cannot do that here.";

                return "Invalid action.";
        }
    }
}
