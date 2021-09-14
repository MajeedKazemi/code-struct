import { Editor } from "../editor/editor";
import { CodeConstruct } from "../syntax-tree/ast";
import { Module } from "../syntax-tree/module";
import { ErrorMessage, ErrorMessageGenerator } from "./error-msg-generator";
import { HoverNotification, Notification, PopUpNotification } from "./notification";

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

const defaultHighlightColour: [number, number, number, number] = [255, 191, 94, 0.3];

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
    addHoverNotification(
        codeToHighlight: CodeConstruct,
        args: any,
        warningText?: string,
        errMsgType?: ErrorMessage,
        highlightColour: [number, number, number, number] = defaultHighlightColour
    ) {
        if (!codeToHighlight.notification) {
            const notif = new HoverNotification(
                this.editor,
                codeToHighlight,
                errMsgType ? this.msgGenerator.generateMsg(errMsgType, args) : warningText ?? "Placeholder Text",
                highlightColour,
                this.notifications.length
            );

            this.notifications.push(notif);
            codeToHighlight.notification = this.notifications[this.notifications.length - 1];
        } else {
            this.removeNotificationFromConstruct(codeToHighlight);
            this.addHoverNotification(codeToHighlight, args, warningText, errMsgType, highlightColour);
        }
    }

    /**
     * Add a pop-up notification to the editor at the specified position.
     *
     * If args and errMsgType are specified, there is no need to specify text as it will be auto-generated.
     */
    addPopUpNotification(code: CodeConstruct, args: any, errMsgType?: ErrorMessage, text?: string) {
        if (text) {
            this.notifications.push(
                new PopUpNotification(
                    this.editor,
                    code,
                    this.msgGenerator.generateMsg(errMsgType, args) ?? text,
                    this.notifications.length
                )
            );
        } else {
            this.notifications.push(
                new PopUpNotification(
                    this.editor,
                    code,
                    this.msgGenerator.generateMsg(errMsgType, args) ?? text,
                    this.notifications.length
                )
            );
        }

        const notif = this.notifications[this.notifications.length - 1];

        setTimeout(() => {
            notif.removeFromDOM();
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

            for (const notification of this.notifications) {
                notification.systemIndex--;
            }
        } else {
            console.warn("Could not remove notification from construct: " + code);
        }
    }

    /**
     * Remove all currently open notifications from the editor.
     */
    clearAllNotifications() {
        this.notifications.forEach((notification) => {
            notification.removeFromDOM();
        });

        this.notifications = [];
    }
}
