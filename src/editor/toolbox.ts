import { Reference } from "../syntax-tree/scope";

export function addVariableReferenceButton(identifier: string, buttonId: string): HTMLDivElement {
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

    return button;
}

export function removeVariableReferenceButton(buttonId: string): void {
    const button = document.getElementById(buttonId);
    document.getElementById("vars-button-grid").removeChild(button);
}
