import { Callback, CallbackType, CodeConstruct, Module, Scope, VariableReferenceExpr } from "../syntax-tree/ast";
import Editor from '../editor/editor';
import { Notification, HoverNotification, PopUpNotification } from "./notification";
import {ErrorMessageGenerator, ErrorMessage} from "./error-msg-generator";
import { Position } from "monaco-editor";
import { getDimensionsFromStyle } from "./util";

export enum ErrorType{
    defaultErr
}

const warningMessages = ["Out of scope var reference.", "Cannot insert this object here."]
const popUpNotificationTime = 3000 //ms

//testing vars
const testText = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. " + 
                 "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor"+ 
                 " in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident," + 
                 " sunt in culpa qui officia deserunt mollit anim id est laborum."

const longTestText = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. "+ 
"Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit" + 
" in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt" +
" mollit anim id est laborum.Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua." + 
" Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in "+ 
"voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim" +
" id est laborum.Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim "+ 
"veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse" +
" cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.Lorem "+ 
"ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud" +
" exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat" +
" nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.Lorem ipsum dolor sit amet,"+ 
" consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco" +
" laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur."+ 
" Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.Lorem ipsum dolor sit amet, consectetur"+ 
" adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris"+
" nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur"+ 
" sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.Lorem ipsum dolor sit amet, consectetur adipiscing elit,"+
" sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo" +
" consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident," +
" sunt in culpa qui officia deserunt mollit anim id est laborum.Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore"+ 
" et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in" +
" reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt"+ 
" mollit anim id est laborum.Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad"+ 
" minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse"+
" cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.Lorem ipsum" +
" dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation"+
" ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur."+ 
" Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."

const shortTestText = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";


//TODO: Consider making this a static class or a singleton, there really should not be two of these anywhere. It will complicate things like keeping track of all notifications present in the program.
//TODO: Update doc for methods in this class
/**
 * Class representing the main entry point of the code into the NotificationSystem. 
 * Top-level class for handling workflow; notification system logic is in NotificationSystem.
 */
export class NotificationSystemController{
	editor: Editor;
    notifications: Notification[];
    msgGenerator: ErrorMessageGenerator;
    module: Module; //TODO: Find some other way to get this. Probably should not be passing this around

    constructor(editor: Editor, module: Module){
        this.editor = editor;
        this.notifications = [];
        this.msgGenerator = new ErrorMessageGenerator();
        this.module = module;
    }

    addHoverNotification(code: CodeConstruct, args: any, errMsgType: ErrorMessage){
        if(!code.notification){
            const notif = new HoverNotification(this.editor, code.getSelection(), this.notifications.length, this.msgGenerator.generateMsg(errMsgType, args))
            this.notifications.push(notif);
            code.notification = this.notifications[this.notifications.length - 1];

            //subscribe to changes to the code construct of this notification because we might need to change position
            const callback = new Callback(() => {notif.updateParentElementPosition(code)})
            notif.callerId = callback.callerId;
            code.subscribe(CallbackType.change, callback);
        }
        else{
            this.removeNotificationFromConstruct(code);
            this.addHoverNotification(code, args, errMsgType);
        }
    }

    addHoverNotifVarOutOfScope(focusedCode: CodeConstruct, args: any, errMsgType: ErrorMessage, scope: Scope, insertedCode: VariableReferenceExpr, focusedPos: Position){
        this.addHoverNotification(focusedCode, args, errMsgType);
        focusedCode.notification.addAvailableVarsArea(scope, this.module, insertedCode, focusedPos);
    }

    addPopUpNotification(){
        this.notifications.push(new PopUpNotification(this.editor, this.notifications.length, "Pop Up!", {left: 0, top: 0}));
        const notif = this.notifications[this.notifications.length - 1];

        setTimeout(() => {
            document.querySelector(".lines-content.monaco-editor-background").removeChild(notif.parentElement);
            this.notifications.splice(notif.index);
        }, popUpNotificationTime);
    }
   
    removeNotificationFromConstruct(code: CodeConstruct){
        if(code?.notification){
            if(code.notification.callerId !== ""){
                code.unsubscribe(CallbackType.change, code.notification.callerId);
            }
            
            this.notifications[code.notification.index].removeNotificationFromDOM();
            this.notifications.splice(code.notification.index, 1);
            code.notification = null;
        }
    }
}
