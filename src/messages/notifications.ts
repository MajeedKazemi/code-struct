import { Module } from "../syntax-tree/module";

export class NotificationManager {
    module: Module;

    constructor(module: Module) {
        this.module = module;
    }

    showNotification(message: string) {
        let notification = document.createElement("div");
        notification.innerHTML = message;
        document.body.appendChild(notification);

        notification.classList.add("notification-container");

        setTimeout(() => {
            notification.classList.add("animate");
        }, 50);

        setTimeout(() => {
            document.body.removeChild(notification);
        }, 5000);
    }
}
