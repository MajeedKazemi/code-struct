export enum TooltipType {
    StepByStepExample = "step-by-step-example",
    UsageHint = "usage-hint",
    RunnableExample = "runnable-example",
}

export class AccordionRow {
    private accordion: Accordion;
    private isOpen: boolean = false;
    private chevronElement: HTMLElement;
    private contentContainer: HTMLDivElement;
    element: HTMLDivElement;
    id: string;

    constructor(
        accordion: Accordion,
        id: string,
        type: TooltipType,
        title: string,
        content: HTMLDivElement,
        onClick: () => void = () => {}
    ) {
        this.id = id;
        this.accordion = accordion;

        this.element = document.createElement("div");
        this.element.classList.add("accordion-row");

        const headerContainer = document.createElement("div");
        headerContainer.classList.add("header-container");

        this.contentContainer = document.createElement("div");
        this.contentContainer.classList.add("content-container");
        this.contentContainer.style.maxHeight = "0px";
        this.contentContainer.appendChild(content);

        this.element.appendChild(headerContainer);
        this.element.appendChild(this.contentContainer);

        const textContainer = document.createElement("div");
        textContainer.classList.add("text-container");

        const typeContainer = document.createElement("div");
        typeContainer.classList.add("type-container");

        const icon = document.createElement("i");
        icon.classList.add("row-icon");
        let typeText = "";

        switch (type) {
            case TooltipType.StepByStepExample: {
                icon.innerHTML = zapIconSVG;
                typeText = "learn";
                typeContainer.classList.add("bg-learn");

                break;
            }

            case TooltipType.UsageHint: {
                icon.innerHTML = lightBulbIconSVG;
                typeText = "hint";
                typeContainer.classList.add("bg-hint");

                break;
            }

            case TooltipType.RunnableExample: {
                icon.innerHTML = playIconSVG;
                typeText = "try";
                typeContainer.classList.add("bg-try");

                break;
            }
        }

        const typeElement = document.createElement("span");
        typeElement.classList.add("row-type");
        typeElement.innerHTML = typeText;

        const titleElement = document.createElement("span");
        titleElement.classList.add("row-title");
        titleElement.innerHTML = title;

        const chevronRightIcon = document.createElement("i");
        chevronRightIcon.classList.add("row-chevron-right-icon");
        chevronRightIcon.innerHTML = chevronRightIconSVG;

        typeContainer.appendChild(icon);
        typeContainer.appendChild(typeElement);
        textContainer.appendChild(typeContainer);
        textContainer.appendChild(titleElement);

        this.chevronElement = document.createElement("i");
        this.chevronElement.classList.add("expand-collapse-button");
        this.chevronElement.innerHTML = chevronDownIconSVG;

        headerContainer.addEventListener("click", () => {
            if (this.isOpen) {
                this.close();
            } else {
                this.open();
                onClick();
            }
        });

        headerContainer.appendChild(textContainer);
        headerContainer.appendChild(this.chevronElement);
    }

    open() {
        this.contentContainer.style.maxHeight = this.contentContainer.scrollHeight + "px";

        setTimeout(() => {
            this.contentContainer.style.maxHeight = "1000px";
        }, 350);

        this.chevronElement.innerHTML = chevronUpIconSVG;

        this.accordion.rows.forEach((row) => {
            if (row !== this) {
                row.close();
            }
        });

        this.isOpen = true;
    }

    close() {
        this.contentContainer.style.maxHeight = "0px";
        this.chevronElement.innerHTML = chevronDownIconSVG;

        this.isOpen = false;
    }
}

export class Accordion {
    rows = new Array<AccordionRow>();
    private id: string;
    container: HTMLDivElement;

    constructor(id: string) {
        this.id = id;

        this.container = document.createElement("div");
        this.container.classList.add("accordion-group-container");
    }

    addRow(type: TooltipType, title: string, content: HTMLDivElement, onClick: () => void = () => {}) {
        const id = this.id + "-" + this.rows.length;
        const row = new AccordionRow(this, id, type, title, content, onClick);
        this.rows.push(row);
        this.container.appendChild(row.element);
    }
}

const playIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="16" fill="white" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
const lightBulbIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="white"><path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" /></svg>`;
const zapIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="16" fill="white" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>`;
const chevronUpIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>`;
const chevronDownIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
const chevronRightIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>`;
