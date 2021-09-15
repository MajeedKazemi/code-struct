import { Statement, VariableReferenceExpr } from "../syntax-tree/ast";
import { InsertionType } from "../syntax-tree/consts";
import { Module } from "../syntax-tree/module";
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

    const toolboxGroupOptions = options.toolboxConstructGroupOptions;

    for (const constructGroup in toolboxGroupOptions) {
        if (toolboxGroupOptions.hasOwnProperty(constructGroup) && toolboxGroupOptions[constructGroup].includeCategory) {
            let categoryDiv;
            if (toolboxGroupOptions[constructGroup].hasOwnProperty("categoryHtml")) {
                const template = document.createElement("template");
                template.innerHTML = toolboxGroupOptions[constructGroup].categoryHtml;
                categoryDiv = template.content.firstChild;
            } else {
                categoryDiv = document.createElement("div");
                categoryDiv.classList.add("group");

                const p = document.createElement("p");
                p.textContent = toolboxGroupOptions[constructGroup].categoryDisplayName;
                categoryDiv.appendChild(p);

                const itemOpts = toolboxGroupOptions[constructGroup].includeCategoryItems;
                for (const item in itemOpts) {
                    if (itemOpts.hasOwnProperty(item) && itemOpts[item]) {
                        const button = ToolboxButton.createToolboxButtonFromJsonObj(
                            options.toolboxDefaultButtonTemplates[item]
                        );
                        categoryDiv.appendChild(button.domElement);
                    }
                }
            }

            toolboxDiv.appendChild(categoryDiv);
        }
    }
}

export class ToolboxButton {
    domElement: HTMLDivElement;

    constructor(text: string, domId?: string, onClickAction?: Function) {
        if (onClickAction) {
            this.domElement.addEventListener("click", () => {
                onClickAction();
            });
        }

        this.domElement = document.createElement("div");
        this.domElement.classList.add("button");

        if (domId) {
            this.domElement.id = domId;
        }

        this.domElement.innerHTML = text.replace(/---/g, "<hole></hole>");
    }

    removeFromDOM() {
        this.domElement.remove();
    }

    static createToolboxButtonFromJsonObj(obj: { id?: string; text: string }) {
        return new ToolboxButton(obj.text, obj?.id);
    }
}

/**
 * Create the cascaded menu div object and its options along with their action handlers.
 */
function constructCascadedMenuObj(
    optionToAction: Map<string, Function>,
    buttonId: string,
    module: Module
): HTMLDivElement {
    const context = module.focus.getContext();
    const menu = document.createElement("div");
    menu.id = `${buttonId}-cascadedMenu`;
    menu.className = "cascadedMenuMainDiv";

    menu.addEventListener("mouseover", () => {
        setTimeout(() => {
            const element = document.getElementById(`${buttonId}-cascadedMenu`);
            const button = document.getElementById(buttonId);

            if (element && !element.matches(":hover") && !button.matches(":hover")) {
                element.remove();
            }
        }, 50);
    });

    for (const [key, value] of optionToAction) {
        const menuItem = document.createElement("div");
        menuItem.classList.add("cascadedMenuContent");

        const menuText = document.createElement("span");
        menuText.classList.add("cascadedMenuOptionTooltip");

        const menuButton = ToolboxButton.createToolboxButtonFromJsonObj({
            text: key,
        }).domElement;
        menuButton.classList.add("cascadedMenuItem");

        menuButton.addEventListener("click", () => {
            value(module.executer, module.eventRouter, context);
        });

        menuItem.appendChild(menuButton);
        menuItem.appendChild(menuText);

        menu.appendChild(menuItem);
    }

    return menu;
}

//creates a cascaded menu dom object with the given options and attaches it to button with id = buttonId.
//also updates its position according to the button it is being attached to.
function createAndAttachCascadedMenu(buttonId: string, optionToAction: Map<string, Function>, module: Module) {
    const button = document.getElementById(buttonId);
    if (!document.getElementById(`${buttonId}-cascadedMenu`)) {
        const menuElement = constructCascadedMenuObj(optionToAction, buttonId, module);

        if (menuElement.children.length > 0) {
            const content = document.createElement("div");
            content.classList.add("cascadedMenuContent");
            button.parentElement.appendChild(menuElement);

            const domMenuElement = document.getElementById(`${buttonId}-cascadedMenu`);
            const leftPos = button.offsetLeft;
            const topPos = button.offsetTop - document.getElementById("editor-toolbox").scrollTop + button.offsetHeight;

            domMenuElement.style.left = `${leftPos}px`;
            domMenuElement.style.top = `${topPos}px`;
        }
    }
}

//helper for creating options for a variable's cascaded menu
function getVarOptions(identifier: string, buttonId: string, module: Module): Map<string, Function> {
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
    const validActions = module.actionFilter.validateVariableOperations(varRef);
    const optionToAction = new Map<string, Function>();

    for (const [key, value] of validActions) {
        if (value.insertionType !== InsertionType.Invalid) {
            optionToAction.set(value.optionName, value.performAction.bind(value)); //NOTE: Important to always bind the function to its EditCodeAction since performAction uses 'this' to route events
        }
    }

    return optionToAction;
}

/**
 * Attach a cascaded menu to DOM element with id buttonId and options from optionToAction map. See constructCascadedMenuObj() for further details.
 * This should be used for static menus only that don't have their options change dynamically.
 *
 * @param buttonId id of the DOM object to which the cascaded menu will be attached
 * @param optionToAction a map of action names to their executor function
 * @param module the main Module object of this program
 */
export function createCascadedMenuForToolboxButton(
    buttonId: string,
    optionToAction: Map<string, Function>,
    module: Module
) {
    const button = document.getElementById(buttonId);

    button.addEventListener("mouseover", () => {
        createAndAttachCascadedMenu(buttonId, optionToAction, module);
    });
}

export function createCascadedMenuForVarRef(buttonId: string, identifier: string, module: Module) {
    const button = document.getElementById(buttonId);

    button.addEventListener("mouseover", () => {
        createAndAttachCascadedMenu(buttonId, getVarOptions(identifier, buttonId, module), module); //it is important that these options are regenerated on each mouseover
    });

    button.addEventListener("mouseleave", () => {
        const element = document.getElementById(`${buttonId}-cascadedMenu`);
        if (element && !element.matches(":hover") && !button.matches(":hover")) {
            element.remove();
        }
    });
}
