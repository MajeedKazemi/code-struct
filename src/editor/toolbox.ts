import { Expression, Statement, VariableReferenceExpr } from "../syntax-tree/ast";
import { DataType, InsertionType } from "../syntax-tree/consts";
import { Module } from "../syntax-tree/module";
import { getUserFriendlyType } from "../utilities/util";
import { EditCodeAction } from "./action-filter";
import { EventAction, EventStack, EventType } from "./event-stack";
import * as options from "./toolbox.json";

export const EDITOR_DOM_ID = "editor";

export function addVariableReferenceButton(identifier: string, buttonId: string, events: EventStack): HTMLDivElement {
    const container = document.createElement("grid");
    container.classList.add("var-button-container");

    const wrapperDiv = document.createElement("div");
    wrapperDiv.classList.add("hoverable");

    container.appendChild(wrapperDiv);

    const button = document.createElement("div");
    button.classList.add("button");
    button.id = buttonId;

    wrapperDiv.appendChild(button);

    const typeText = document.createElement("div");
    typeText.classList.add("var-type-text");
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
    document.getElementById("vars-button-grid").removeChild(parent.parentElement);
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

export function updateButtonsVisualMode(insertionRecords: EditCodeAction[]) {
    for (const insertionRecord of insertionRecords) {
        const button = document.getElementById(insertionRecord.cssId) as HTMLButtonElement;

        if (button) {
            if (insertionRecord.insertionType === InsertionType.DraftMode) {
                addClassToButton(insertionRecord.cssId, Module.draftModeButtonClass);
                removeClassFromButton(insertionRecord.cssId, Module.disabledButtonClass);
                button.disabled = false;
            } else if (insertionRecord.insertionType === InsertionType.Valid) {
                removeClassFromButton(insertionRecord.cssId, Module.draftModeButtonClass);
                removeClassFromButton(insertionRecord.cssId, Module.disabledButtonClass);
                button.disabled = false;
            } else {
                removeClassFromButton(insertionRecord.cssId, Module.draftModeButtonClass);
                addClassToButton(insertionRecord.cssId, Module.disabledButtonClass);
                button.disabled = true;
            }
        }
    }
}

export function loadToolboxFromJson() {
    const toolboxDiv = document.getElementById("editor-toolbox");
    const toolboxMenu = document.getElementById("toolbox-menu");
    const staticDummySpace = document.getElementById("static-toolbox-dummy-space");

    const toolboxGroupOptions = options.toolboxConstructGroupOptions;

    for (const constructGroup in toolboxGroupOptions) {
        if (toolboxGroupOptions.hasOwnProperty(constructGroup) && toolboxGroupOptions[constructGroup].includeCategory) {
            let categoryDiv;

            categoryDiv = document.createElement("div");
            categoryDiv.id = toolboxGroupOptions[constructGroup].categoryId;
            categoryDiv.classList.add("group");

            const p = document.createElement("p");
            p.textContent = toolboxGroupOptions[constructGroup].categoryDisplayName;
            categoryDiv.appendChild(p);

            const itemOpts = toolboxGroupOptions[constructGroup].includeCategoryItems;
            for (const item in itemOpts) {
                if (item == "customHtml") {
                    const template = document.createElement("div");
                    template.innerHTML = itemOpts[item];

                    categoryDiv.appendChild(template);
                } else if (itemOpts.hasOwnProperty(item) && itemOpts[item]) {
                    const button = ToolboxButton.createToolboxButtonFromJsonObj(
                        options.toolboxDefaultButtonTemplates[item]
                    );
                    categoryDiv.appendChild(button.container);
                }
            }

            toolboxDiv.insertBefore(categoryDiv, staticDummySpace);

            const menuButton = document.createElement("div");
            menuButton.classList.add("menu-button");
            menuButton.innerText = toolboxGroupOptions[constructGroup].categoryDisplayName;

            menuButton.addEventListener("click", () => {
                document
                    .getElementById(toolboxGroupOptions[constructGroup].categoryId)
                    .scrollIntoView({ behavior: "smooth" });
            });

            toolboxMenu.appendChild(menuButton);
        }
    }

    staticDummySpace.style.minHeight = `${
        toolboxDiv.clientHeight - toolboxDiv.children[toolboxDiv.children.length - 2].clientHeight - 20
    }px`;
}

export class ToolboxButton {
    container: HTMLDivElement;

    constructor(text: string, domId?: string, returnType?: string) {
        this.container = document.createElement("div");
        this.container.classList.add("var-button-container");

        const button = document.createElement("div");
        button.classList.add("button");

        this.container.appendChild(button);

        if (returnType) {
            const typeText = document.createElement("div");
            typeText.classList.add("var-type-text");
            typeText.innerText = returnType;

            this.container.appendChild(typeText);
        }

        if (domId) {
            button.id = domId;
        }

        button.innerHTML = text.replace(/---/g, "<hole></hole>");

        const helpButton = document.createElement("div");
        helpButton.classList.add("help-button");
        helpButton.innerText = "learn";

        this.container.appendChild(helpButton);
    }

    getButtonElement(): Element {
        return this.container.getElementsByClassName("button")[0];
    }

    removeFromDOM() {
        this.container.remove();
    }

    static createToolboxButtonFromJsonObj(obj: { id?: string; text: string; returnType?: string }) {
        return new ToolboxButton(obj.text, obj?.id, obj?.returnType);
    }
}

/**
 * Create the cascaded menu div object and its options along with their action handlers.
 */
function constructCascadedMenuObj(
    validActions: Map<string, EditCodeAction>,
    buttonId: string,
    module: Module,
    identifier: string
): HTMLDivElement {
    const context = module.focus.getContext();
    const menu = document.createElement("div");
    menu.id = `${buttonId}-cascadedMenu`;
    menu.className = "cascadedMenuMainDiv";

    const header = document.createElement("div");
    header.classList.add("cascaded-menu-header");
    header.innerHTML = `<h3>actions with <span class="identifier">${identifier}</span></h3>`;
    menu.appendChild(header);

    menu.addEventListener("mouseover", () => {
        setTimeout(() => {
            const element = document.getElementById(`${buttonId}-cascadedMenu`);
            const button = document.getElementById(buttonId);

            if (element && !element.matches(":hover") && !button.matches(":hover")) {
                element.remove();
            }
        }, 100);
    });

    const menuItem = document.createElement("div");
    menuItem.classList.add("cascadedMenuContent");

    const varContainer = document.createElement("grid");
    varContainer.classList.add("var-button-container");

    const button = document.createElement("div");
    button.classList.add("button");
    button.id = buttonId;

    varContainer.appendChild(button);

    const typeText = document.createElement("div");
    typeText.classList.add("var-type-text");
    varContainer.appendChild(typeText);

    const curContext = module.focus.getContext();

    typeText.innerText =
        "-> " +
        getUserFriendlyType(
            module.variableController.getVariableTypeNearLine(
                curContext.lineStatement.rootNode.scope,
                curContext.position.lineNumber,
                identifier,
                false
            )
        );

    button.textContent = identifier;

    button.addEventListener("click", () => {
        const action = new EventAction(EventType.OnButtonDown, button.id);
        module.eventStack.stack.push(action);
        module.eventStack.apply(action);

        menu.remove();
    });

    menuItem.appendChild(varContainer);
    menu.appendChild(menuItem);

    for (const [key, value] of validActions) {
        const menuItem = document.createElement("div");
        menuItem.classList.add("cascadedMenuContent");

        const menuText = document.createElement("span");
        menuText.classList.add("cascadedMenuOptionTooltip");

        const code = value.getCode();
        let returnType = null;

        if (code instanceof Expression && code.returns != DataType.Void) {
            returnType = " -> " + getUserFriendlyType(code.returns);
        }

        const menuButton = ToolboxButton.createToolboxButtonFromJsonObj({
            text: value.optionName,
            returnType: returnType,
        });

        menuButton.getButtonElement().classList.add("cascadedMenuItem");
        value.performAction.bind(value);

        menuButton.getButtonElement().addEventListener("click", () => {
            value.performAction(module.executer, module.eventRouter, context);

            menu.remove();
        });

        if (value.insertionType == InsertionType.Invalid) menuButton.getButtonElement().classList.add("disabled");

        menuItem.appendChild(menuButton.container);
        menuItem.appendChild(menuText);

        menu.appendChild(menuItem);
    }

    return menu;
}

//creates a cascaded menu dom object with the given options and attaches it to button with id = buttonId.
//also updates its position according to the button it is being attached to.
function createAndAttachCascadedMenu(
    buttonId: string,
    validActions: Map<string, EditCodeAction>,
    module: Module,
    identifier: string
) {
    const button = document.getElementById(buttonId);
    if (!document.getElementById(`${buttonId}-cascadedMenu`)) {
        const menuElement = constructCascadedMenuObj(validActions, buttonId, module, identifier);

        if (menuElement.children.length > 0) {
            const content = document.createElement("div");
            content.classList.add("cascadedMenuContent");
            button.parentElement.appendChild(menuElement);

            const domMenuElement = document.getElementById(`${buttonId}-cascadedMenu`);
            const buttonRect = button.getBoundingClientRect();
            const bodyRect = document.body.getBoundingClientRect();

            const leftPos = buttonRect.left - bodyRect.left + buttonRect.width;
            const topPos = buttonRect.top - bodyRect.top + buttonRect.height;

            domMenuElement.style.left = `${leftPos}px`;
            domMenuElement.style.bottom = `${bodyRect.bottom - buttonRect.bottom}px`;
        }
    }
}

// helper for creating options for a variable's cascaded menu
function getVarOptions(identifier: string, buttonId: string, module: Module): Map<string, EditCodeAction> {
    const dataType = module.variableController.getVariableTypeNearLine(
        module.focus.getFocusedStatement().scope ??
            (
                module.focus.getStatementAtLineNumber(module.editor.monaco.getPosition().lineNumber).rootNode as
                    | Statement
                    | Module
            ).scope,
        module.editor.monaco.getPosition().lineNumber,
        identifier,
        false
    );
    const varRef = new VariableReferenceExpr(identifier, dataType, buttonId);
    return module.actionFilter.validateVariableOperations(varRef);
}

export function createCascadedMenuForVarRef(buttonId: string, identifier: string, module: Module) {
    const button = document.getElementById(buttonId);

    button.addEventListener("mouseover", () => {
        createAndAttachCascadedMenu(buttonId, getVarOptions(identifier, buttonId, module), module, identifier); //it is important that these options are regenerated on each mouseover
    });

    button.addEventListener("mouseleave", () => {
        const element = document.getElementById(`${buttonId}-cascadedMenu`);
        if (element && !element.matches(":hover") && !button.matches(":hover")) {
            element.remove();
        }
    });
}

window.onresize = () => {
    const staticDummySpace = document.getElementById("static-toolbox-dummy-space");

    staticDummySpace.style.minHeight = `${
        staticDummySpace.parentElement.clientHeight -
        staticDummySpace.parentElement.children[staticDummySpace.parentElement.children.length - 2].clientHeight -
        20
    }px`;
};
