import { CallbackType, CodeConstruct, Statement, Token} from "../syntax-tree/ast";
import Editor from '../editor/editor';
import {Range} from "monaco-editor";
import { Notification } from "./notification";


/**
 * Class representing the main entry point of the code into the NotificationSystem. 
 * Top-level class for handling workflow; notification system logic is in NotificationSystem.
 */
export class NotificationSystemController{
	editor: Editor;
    notifications: Notification[];

    constructor(editor: Editor){
        this.editor = editor;
        this.notifications = [];
    }

    
    //TODO: Need to add logic for deciding what type of notification we will be adding and the text and style it takes
    addNotification(code: CodeConstruct){
        const errorRange = new Range(code.getLineNumber(), code.left, code.getLineNumber(), code.right + 1);
        this.notifications.push(new Notification(this.editor, errorRange, this.notifications.length, "notificationHighlight", "Error Message Here"));
        code.notification = this.notifications[this.notifications.length - 1];
    }
   
    removeNotification(code: CodeConstruct, notif: Notification){
        notif.dispose();
        this.notifications.splice(notif.index, 1);

        code.notification = null;
    }
}




/** NOTES
 * To remove previously set decorations you need to save the decorations somewhere when you are creating them and then call
 * this.editor.monaco.deltaDecorations(decorations, [{ range: new monaco.Range(1,1,1,1), options : { } }]
        );
    To remove them whenever


    To remove a hover, need to save its hoverProvider somewhere and then call dispose
 */