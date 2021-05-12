import { CodeConstruct } from "../syntax-tree/ast";
import Editor from '../editor/editor';
import { Notification, HoverNotification, PopUpNotification } from "./notification";


export enum NotificationMessageType{
    outOfScopeVariableReference,
    defaultNotification,
}

const warningMessages = ["Out of scope var reference.", "Cannot insert this object here."]

//TODO: Consider making this a static class or a singleton, there really should not be two of these anywhere. It will complicate things like keeping track of all notifications present in the program.
//TODO: Update doc for methods in this class
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

    addHoverNotification(code: CodeConstruct){
        this.notifications.push(new HoverNotification(this.editor, code.getSelection(), this.notifications.length));
        code.notification = this.notifications[this.notifications.length - 1];
    }

    addPopUpNotification(code: CodeConstruct){
        this.notifications.push(new PopUpNotification(this.editor, code.getSelection(), this.notifications.length));
        code.notification = this.notifications[this.notifications.length - 1];

        setTimeout(() => {
            this.removeNotification(code);
        }, PopUpNotification.notificationTime);
    }
   
    removeNotification(code: CodeConstruct){
        this.notifications[code.notification.index].removeNotificationFromDOM();
        this.notifications.splice(code.notification.index, 1);
        code.notification = null;
    }
}
