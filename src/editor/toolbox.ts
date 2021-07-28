import { Reference } from "../syntax-tree/scope";
import { EventAction, EventStack, EventType } from "./event-stack";

export function addVariableReferenceButton(identifier: string, buttonId: string, events: EventStack): HTMLDivElement {
    const container = document.createElement("grid");
    container.classList.add("var-button-container");

    const button = document.createElement("div");
    button.classList.add("button");
    button.id = buttonId;

    const typeText = document.createElement("div");
    typeText.classList.add("var-type-text");

    container.appendChild(button);
    container.appendChild(typeText);

    document.getElementById("vars-button-grid").appendChild(container);

    button.textContent = identifier;

    button.addEventListener("click", () => {
        const action = new EventAction(EventType.OnButtonDown, button.id);
        events.stack.push(action);
        events.apply(action);
    });

    return button;
}

export function removeVariableReferenceButton(buttonId: string): void {
    const button = document.getElementById(buttonId);
    const parent = button.parentElement;
    document.getElementById("vars-button-grid").removeChild(parent);
}
