import { BinaryOperator, BinaryOperatorExpr, Callback, CallbackType, CodeConstruct, DataType, Expression, FunctionCallStmt, Module, OperatorTkn, Scope, Statement, TypedEmptyExpr } from "../syntax-tree/ast";
import { Editor } from "../editor/editor";
import { Notification, HoverNotification, PopUpNotification } from "./notification";
import { ErrorMessageGenerator, ErrorMessage } from "./error-msg-generator";
import { Position } from "monaco-editor";

const popUpNotificationTime = 3000; //ms

//TODO: testing vars; remove later
const testText =
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. " +
    "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor" +
    " in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident," +
    " sunt in culpa qui officia deserunt mollit anim id est laborum.";

const longTestText =
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. " +
    "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit" +
    " in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt" +
    " mollit anim id est laborum.Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua." +
    " Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in " +
    "voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim" +
    " id est laborum.Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim " +
    "veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse" +
    " cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.Lorem " +
    "ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud" +
    " exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat" +
    " nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.Lorem ipsum dolor sit amet," +
    " consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco" +
    " laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur." +
    " Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.Lorem ipsum dolor sit amet, consectetur" +
    " adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris" +
    " nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur" +
    " sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.Lorem ipsum dolor sit amet, consectetur adipiscing elit," +
    " sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo" +
    " consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident," +
    " sunt in culpa qui officia deserunt mollit anim id est laborum.Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore" +
    " et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in" +
    " reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt" +
    " mollit anim id est laborum.Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad" +
    " minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse" +
    " cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.Lorem ipsum" +
    " dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation" +
    " ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur." +
    " Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";

const shortTestText =
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";

const defaultHighlightColour: [number,number, number, number] = [255, 191, 94, 0.3];

/**
 * Class representing the main entry point of the code into the NotificationSystem.
 * Top-level class for handling workflow; notification system logic is in NotificationSystem.
 */
export class NotificationSystemController {
    editor: Editor;
    notifications: Notification[];
    msgGenerator: ErrorMessageGenerator;
    module: Module; //TODO: Find some other way to get this. Probably should not be passing this around, maybe make it a method argument for methods that need it, instead of each instance holding a reference

    constructor(editor: Editor, module: Module) {
        this.editor = editor;
        this.notifications = [];
        this.msgGenerator = new ErrorMessageGenerator();
        this.module = module;
    }

    /**
     * Add a hover notification to a code construct.
     *
     * @param code       code construct being added to (hole, empty line, etc... Not the code being added)
     * @param args       context for constructing appropriate message. See error-msg-generator.ts for more info
     * @param errMsgType type of error message the notification should display when hovered over
     */
    addHoverNotification(codeToHighlight:CodeConstruct, args: any, warningText?: string, errMsgType?: ErrorMessage, highlightColour: [number, number, number, number] = defaultHighlightColour) {
        const notif = new HoverNotification(
            this.editor,
            codeToHighlight,
            errMsgType ? this.msgGenerator.generateMsg(errMsgType, args) : (warningText ?? "Placeholder Text"),
            highlightColour,
            this.notifications.length
        );

        if (!codeToHighlight.notification) {
            this.notifications.push(notif);
            codeToHighlight.notification = this.notifications[this.notifications.length - 1];
        } else {
            this.removeNotificationFromConstruct(codeToHighlight);
            this.addHoverNotification(codeToHighlight, args, warningText, errMsgType, highlightColour);
        }

        return notif;
    }

    /**
     * Add a pop-up notification to the editor at the specified position.
     * 
     * If args and errMsgType are specified, there is no need to specify text as it will be auto-generated.
     */
    addPopUpNotification(code: CodeConstruct, args: any, errMsgType?: ErrorMessage, text?: string) {
        if(text){
            this.notifications.push(
                new PopUpNotification(this.editor, code, this.msgGenerator.generateMsg(errMsgType, args) ?? text, this.notifications.length)
            );
        }
        else{
            this.notifications.push(
                new PopUpNotification(this.editor, code, this.msgGenerator.generateMsg(errMsgType, args) ?? text, this.notifications.length, )
            );
        }

        const notif = this.notifications[this.notifications.length - 1];

        setTimeout(() => {
            document.querySelector(".lines-content.monaco-editor-background").removeChild(notif.domElement);
            this.notifications.splice(notif.systemIndex);
        }, popUpNotificationTime);
    }

    /**
     * Remove notification from given code construct if it exists.
     *
     * @param code code construct to remove notification from
     */
    removeNotificationFromConstruct(code: CodeConstruct) {
        if (code?.notification) {
            this.notifications[code.notification.systemIndex].removeFromDOM();
            this.notifications.splice(code.notification.systemIndex, 1);
            code.notification = null;
        }
        else{
            console.warn("Could not remove notification from construct: " + code)
        }
    }

    clearAllNotifications() {
        this.notifications.forEach((notification) => {
            notification.removeFromDOM();
        });

        this.notifications = [];
    }

    addBinBoolOpOperandInsertionTypeMismatchWarning(codeToHighlight: CodeConstruct, insertInto: TypedEmptyExpr, codeInserted: Expression){
        this.addHoverNotification(
            codeToHighlight,
            { binOp: (insertInto.rootNode as BinaryOperatorExpr).operator, argType1: codeInserted.returns },
            "",
            ErrorMessage.boolOpArgTypeMismatch
        );
    }

    addFunctionCallArgumentTypeMismatchWarning(codeToHighlight: CodeConstruct, insertInto: TypedEmptyExpr, insertCode: Expression){
        this.addHoverNotification(
            codeToHighlight,
            {
                argType1: insertInto.type,
                argType2: insertCode.returns,
                methodName: (insertInto.rootNode as FunctionCallStmt).getFunctionName(),
            },
            "",
            ErrorMessage.methodArgTypeMismatch
        );
    }

    addStatementHoleTypeMismatchWarning(codeToHighlight: CodeConstruct, insertInto: TypedEmptyExpr, insertCode: Expression){
        this.addHoverNotification(
            codeToHighlight,
            {
                addedType: insertCode.returns,
                constructName: insertInto.getParentStatement().getKeyword(),
                expectedType: insertInto.type,
            },
            "",
            ErrorMessage.exprTypeMismatch
        );
    }

    addBinOpOperandTypeMismatchWarning(codeToHightlight: CodeConstruct, insertInto: TypedEmptyExpr, insertCode: Expression){
        this.addHoverNotification(
            codeToHightlight,
            {
                binOp: (insertInto.rootNode as BinaryOperatorExpr).operator,
                argType1: insertInto.type,
                argType2: insertCode.returns,
            },
            "",
            ErrorMessage.binOpArgTypeMismatch
        );
    }

    addCompOpOperandTypeMismatchWarning(codeToHightlight: CodeConstruct, insertInto: TypedEmptyExpr, insertCode: Expression){
        this.addHoverNotification(
            codeToHightlight,
            {
                binOp: (insertInto.rootNode as BinaryOperatorExpr).operator,
                argType1: insertInto.type,
                argType2: insertCode.returns,
            },
            "",
            ErrorMessage.compOpArgTypeMismatch
        );
    }
}
