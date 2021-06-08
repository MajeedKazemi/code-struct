import { Callback, CallbackType, CodeConstruct, Module, Scope, VariableReferenceExpr } from "../syntax-tree/ast";
import Editor from '../editor/editor';
import { Notification, HoverNotification, PopUpNotification } from "./notification";
import {ErrorMessageGenerator, ErrorMessage} from "./error-msg-generator";
import { Position } from "monaco-editor";

const popUpNotificationTime = 3000 //ms

//TODO: testing vars; remove later
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

/**
 * Class representing the main entry point of the code into the NotificationSystem. 
 * Top-level class for handling workflow; notification system logic is in NotificationSystem.
 */
export class NotificationSystemController{
	editor: Editor;
    notifications: Notification[];
    msgGenerator: ErrorMessageGenerator;
    module: Module; //TODO: Find some other way to get this. Probably should not be passing this around, maybe make it a method argument for methods that need it, instead of each instance holding a reference

    constructor(editor: Editor, module: Module){
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

    /**
     * Add a hover notification for attempting to use a variable out of scope with suggestions of in-scope variables. 
     * 
     * @param focusedCode code construct where the reference was attempted to be added 
     * @param args        context for constructing appropriate message. See error-msg-generator.ts for more info
     * @param errMsgType  type of error message the notification should display when hovered over
     * @param scope       scope of available variables
     * @param focusedPos  position within the editor (line and column) of where the variable was attempted to be referenced
     */
    addHoverNotifVarOutOfScope(focusedCode: CodeConstruct, args: any, errMsgType: ErrorMessage, scope: Scope, focusedPos: Position){
        this.addHoverNotification(focusedCode, args, errMsgType);
        focusedCode.notification.addInScopeVarsArea(scope, this.module, focusedCode, focusedPos);
    }


    /**
     * Add a pop-up notification to the editor at the specified position.
     */
    addPopUpNotification(){
        this.notifications.push(new PopUpNotification(this.editor, this.notifications.length, "Pop Up!", {left: 0, top: 0}));
        const notif = this.notifications[this.notifications.length - 1];

        setTimeout(() => {
            document.querySelector(".lines-content.monaco-editor-background").removeChild(notif.parentElement);
            this.notifications.splice(notif.index);
        }, popUpNotificationTime);
    }
   
    /**
     * Remove notification from given code construct if it exists.
     * 
     * @param code code construct to remove notification from
     */
    removeNotificationFromConstruct(code: CodeConstruct){
        if(code?.notification){

            //notifications are subscribed to changed in position, so need to unsub
            if(code.notification.callerId !== ""){
                code.unsubscribe(CallbackType.change, code.notification.callerId);
            }
            
            this.notifications[code.notification.index].removeNotificationFromDOM();
            this.notifications.splice(code.notification.index, 1);
            code.notification = null;
        }
    }

    clearAllNotifications(){
        this.notifications.forEach(notification => {
            notification.removeNotificationFromDOM();
        });

        this.notifications = [];
    }
}
