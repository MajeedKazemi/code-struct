import { editor } from "monaco-editor";

export class DocumentationBox {
    private static exampleCounter = 0;

    constructor(uniqueId: string, documentation: any) {
        const container = document.createElement("div");
        container.classList.add("doc-box-container");
        container.id = uniqueId;

        const headerDiv = document.createElement("div");
        headerDiv.classList.add("doc-box-header");

        const closeButton = document.createElement("div");
        closeButton.classList.add("close-button");
        closeButton.innerHTML = `<span>&times;</span>`;

        closeButton.onclick = () => {
            container.remove();
        };

        const docTitle = document.createElement("h3");
        docTitle.classList.add("doc-title");
        docTitle.innerText = documentation.title;
        headerDiv.appendChild(docTitle);

        headerDiv.appendChild(closeButton);
        container.appendChild(headerDiv);

        document.body.appendChild(container);
        makeDraggable(headerDiv);

        // the documentation:
        const docBody = document.createElement("div");
        docBody.classList.add("doc-body");
        container.appendChild(docBody);

        for (const item of documentation.body) {
            if (item.hasOwnProperty("paragraph")) {
                const p = document.createElement("p");
                p.innerHTML = item.paragraph;

                docBody.appendChild(p);
            } else if (item.hasOwnProperty("example")) {
                docBody.appendChild(createExample(item));
            }
        }
    }

    static getNewConsoleId(): string {
        return "console-id-" + DocumentationBox.exampleCounter++;
    }
}

function createExample(item): HTMLDivElement {
    const editorContainer = document.createElement("div");
    editorContainer.classList.add("doc-editor-container");

    const editorHeader = document.createElement("div");
    editorHeader.innerText = "Example Code";
    editorHeader.classList.add("doc-editor-header");
    editorContainer.appendChild(editorHeader);

    const exampleEditor = document.createElement("div");
    exampleEditor.classList.add("doc-editor");
    editorContainer.appendChild(exampleEditor);

    const exampleConsole = document.createElement("div");
    exampleConsole.classList.add("doc-example-console");
    editorContainer.appendChild(exampleConsole);

    const buttonContainer = document.createElement("div");
    buttonContainer.classList.add("doc-example-console-button-container");
    exampleConsole.appendChild(buttonContainer);

    const consoleId = DocumentationBox.getNewConsoleId();

    const runButton = document.createElement("div");
    runButton.innerText = "> Run";
    runButton.id = `run-${consoleId}`;
    runButton.classList.add(...["console-button", "run-code-btn", "doc-example-btn"]);
    buttonContainer.appendChild(runButton);

    const clearConsoleButton = document.createElement("div");
    clearConsoleButton.innerText = "Clear";
    clearConsoleButton.id = `clear-${consoleId}`;
    clearConsoleButton.classList.add(...["doc-example-btn", "console-button", "clear-output-btn"]);
    buttonContainer.appendChild(clearConsoleButton);

    const resetConsoleButton = document.createElement("div");
    resetConsoleButton.innerText = "Reset";
    resetConsoleButton.id = `reset-${consoleId}`;
    resetConsoleButton.classList.add(...["doc-example-btn", "console-button", "reset-editor-btn"]);
    buttonContainer.appendChild(resetConsoleButton);

    const consoleOutput = document.createElement("div");
    consoleOutput.id = `console-output-${consoleId}`;
    consoleOutput.classList.add("console-output");
    exampleConsole.appendChild(consoleOutput);

    const codeEditor = editor.create(exampleEditor, {
        value: item.example,
        language: "python",
        dimension: { width: 200, height: 100 },
        minimap: {
            enabled: false,
        },
        overviewRulerLanes: 0,
        overviewRulerBorder: false,
        contextmenu: false,
        mouseWheelScrollSensitivity: 0,
        automaticLayout: true,
        scrollbar: {
            vertical: "auto",
            horizontal: "auto",
            verticalSliderSize: 5,
            scrollByPage: false,
        },
        fontSize: 13,
        lineHeight: 19,
    });

    codeEditor.onDidChangeModelContent(() => {
        resetConsoleButton.style.visibility = "visible";
    });

    resetConsoleButton.addEventListener("click", () => {
        codeEditor.setValue(item.example);
    });

    return editorContainer;
}

function makeDraggable(element: HTMLDivElement) {
    var pos1 = 0,
        pos2 = 0,
        pos3 = 0,
        pos4 = 0;

    if (document.getElementById(element.id + "header")) {
        // if present, the header is where you move the DIV from:
        document.getElementById(element.id + "header").onmousedown = dragMouseDown;
    } else {
        // otherwise, move the DIV from anywhere inside the DIV:
        element.onmousedown = dragMouseDown;
    }

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();

        // get the mouse cursor position at startup:
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;

        // call a function whenever the cursor moves:
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();

        // calculate the new cursor position:
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;

        if (
            element.parentElement.offsetTop - pos2 > 0 &&
            window.innerHeight - (element.parentElement.offsetTop - pos2 + element.parentElement.clientHeight) > 0
        ) {
            // set the element's new position:
            element.parentElement.style.top = element.parentElement.offsetTop - pos2 + "px";
        }

        if (
            element.parentElement.offsetLeft - pos1 > 0 &&
            window.innerWidth - (element.parentElement.offsetLeft - pos1 + element.parentElement.clientWidth) > 0
        ) {
            element.parentElement.style.left = element.parentElement.offsetLeft - pos1 + "px";
        }
    }

    function closeDragElement() {
        // stop moving when mouse button is released:
        document.onmouseup = null;
        document.onmousemove = null;
    }
}
