export function addVariableReferenceButton(identifier: string, buttonId: string): HTMLDivElement {
    const button = document.createElement("div");
    button.classList.add("button");
    button.id = buttonId;

    document.getElementById("variables").appendChild(button);

    button.textContent = identifier;

    return button;
}

export function removeVariableReferenceButton(buttonId: string): void {
    const button = document.getElementById(buttonId);
    document.getElementById("variables").removeChild(button);
}
