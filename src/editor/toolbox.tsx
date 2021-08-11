import React from "react";
import { InsertionType } from "../syntax-tree/consts";
import { Module } from "../syntax-tree/module";
import { InsertionRecord } from "./action-filter";
import { EventAction, EventStack, EventType } from "./event-stack";
import ToolboxCascadedMenu from "../components/toolbox-cascaded-menu";
import * as ReactDOM from 'react-dom';
import { nova } from "..";


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

    const menuElement = React.createElement(ToolboxCascadedMenu, {children: [<div className="cascadedMenuItem">wowowow</div>, <div className="cascadedMenuItem">wowowow</div>, <div className="cascadedMenuItem">wowowow</div>, <div className="cascadedMenuItem">wowowow</div>, <div className="cascadedMenuItem">wowowow</div>, <div className="cascadedMenuItem">wowowow</div>], id: `${buttonId}-cascadedMenu`, buttonId: buttonId});
    button.addEventListener("mouseover", () => {
        if(!document.getElementById(`${buttonId}-cascadedMenu`)){
            const portal = ReactDOM.createPortal(menuElement, document.getElementById("mainToolboxDiv"));
            const content = document.createElement("div");
            content.classList.add("cascadedMenuContent");
            ReactDOM.render(portal, content);
    
            const domMenuElement = document.getElementById(`${buttonId}-cascadedMenu`);
            const leftPos = button.offsetLeft;
            const topPos =  button.offsetTop -  document.getElementById("mainToolboxDiv").scrollTop + button.offsetHeight;
            
            domMenuElement.style.left = `${leftPos}px`;
            domMenuElement.style.top = `${topPos + 5}px`;
        }
    })

    button.addEventListener("mouseleave", () => {
        setTimeout(() => {
            const element = document.getElementById(`${buttonId}-cascadedMenu`);
            if(element && !element.matches(":hover") && !button.matches(":hover")){
                element.remove();
            }
        }, 50)
    })

    return button;
}

export function removeVariableReferenceButton(buttonId: string): void {
    const button = document.getElementById(buttonId);
    const parent = button.parentElement;
    document.getElementById("vars-button-grid").removeChild(parent);
}

export function addClassToButton(buttonId: string, className: string) {
    const button = document.getElementById(buttonId);

    if (button) {
        button.classList.add(className);
    }
}

export function removeClassFromButton(buttonId: string, className: string) {
    const button = document.getElementById(buttonId);

    if (button) {
        button.classList.remove(className);
    }
}

export function updateButtonsVisualMode(insertionRecords: InsertionRecord[]) {
    for (const insertionRecord of insertionRecords) {
        const button = document.getElementById(insertionRecord.domButtonId) as HTMLButtonElement;

        if (insertionRecord.insertionType === InsertionType.DraftMode) {
            addClassToButton(insertionRecord.domButtonId, Module.draftModeButtonClass);
            removeClassFromButton(insertionRecord.domButtonId, Module.disabledButtonClass);
            button.disabled = false;
        } else if (insertionRecord.insertionType === InsertionType.Valid) {
            removeClassFromButton(insertionRecord.domButtonId, Module.draftModeButtonClass);
            removeClassFromButton(insertionRecord.domButtonId, Module.disabledButtonClass);
            button.disabled = false;
        } else {
            removeClassFromButton(insertionRecord.domButtonId, Module.draftModeButtonClass);
            addClassToButton(insertionRecord.domButtonId, Module.disabledButtonClass);
            button.disabled = true;
        }
    }
}
