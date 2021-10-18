import { editor } from "monaco-editor";
import { runBtnToOutputWindow } from "../index";
import { clearConsole } from "../pyodide-ts/pyodide-ui";

const INITIAL_Z_INDEX = 500;

export const docBoxRunButtons = new Map<string, string[]>();

export class DocumentationBox {
    private static exampleCounter = 0;
    private static openBoxes: DocBoxMeta[] = [];
    private static pressedEscape = false;

    constructor(uniqueId: string, documentation: any) {
        const container = document.createElement("div");
        container.classList.add("doc-box-container");
        container.id = `doc-box-${uniqueId}`;
        docBoxRunButtons.set(container.id, []);

        const headerDiv = document.createElement("div");
        headerDiv.classList.add("doc-box-header");

        const closeButton = document.createElement("div");
        closeButton.classList.add("close-button");
        closeButton.innerHTML = `<span>&times;</span>`;

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
                const ex = createExample(item);
                docBody.appendChild(ex[0]);
                docBoxRunButtons.set(container.id, ex[1]);

                // attachPyodideActions(
                //     (() => {
                //         const actions = [];
                //         for (const buttonId of ex[1]) {
                //             actions.push((pyodideController) => {
                //                 const button = document.getElementById(buttonId);
                //                 button.addEventListener("click", () => {
                //                     try {
                //                         nova.globals.lastPressedRunButtonId = button.id;

                //                         pyodideController.runPython(codeString(ex[2].getValue()));
                //                     } catch (err) {
                //                         console.error("Unable to run python code");
                //                         addTextToConsole(
                //                             runBtnToOutputWindow.get(button.id),
                //                             err,
                //                             CONSOLE_ERR_TXT_CLASS
                //                         );
                //                     }
                //                 });
                //             });
                //         }

                //         return actions;
                //     })(),
                //     []
                // );
            } else if (item.hasOwnProperty("block-based-image")) {
                docBody.appendChild(createImage(item));
            }
        }

        window.addEventListener("mousedown", function (e) {
            if (container.contains(e.target as Element)) DocumentationBox.focusBox(container.id);
            else headerDiv.classList.remove("focused-header");
        });

        closeButton.onclick = () => {
            DocumentationBox.closeBox(container.id);
        };

        document.addEventListener("keydown", (ev) => {
            if (ev.key == "Escape") {
                DocumentationBox.pressedEscape = true;
            }
        });

        document.addEventListener("keyup", (ev) => {
            if (ev.key == "Escape" && DocumentationBox.pressedEscape) {
                const focusedBox = DocumentationBox.openBoxes.find((box) => box.isFocused);
                if (focusedBox) DocumentationBox.closeBox(focusedBox.id);

                DocumentationBox.pressedEscape = false;
            }
        });

        DocumentationBox.addNewBox(container.id);
    }

    static getNewConsoleId(): string {
        return "console-id-" + DocumentationBox.exampleCounter++;
    }

    static addNewBox(id: string) {
        let newZIndex = INITIAL_Z_INDEX;

        if (DocumentationBox.openBoxes.length > 0) {
            newZIndex = Math.max(...DocumentationBox.openBoxes.map((box) => box.zIndex)) + 1;
        }

        DocumentationBox.openBoxes.push(new DocBoxMeta(id, true, newZIndex));
        DocumentationBox.setZIndex(id, newZIndex);
        DocumentationBox.focusBox(id);
    }

    static closeBox(id: string) {
        // should become the highest
        DocumentationBox.focusBox(id);

        document.getElementById(id).remove();
        DocumentationBox.openBoxes.splice(
            DocumentationBox.openBoxes.findIndex((box) => box.id == id),
            1
        );

        const maxZIndex = Math.max(...DocumentationBox.openBoxes.map((box) => box.zIndex));
        const maxZIndexId = DocumentationBox.openBoxes.find((box) => box.zIndex == maxZIndex)?.id;

        if (maxZIndexId) DocumentationBox.focusBox(maxZIndexId);

        for (const buttonId of docBoxRunButtons.get(id)) {
            runBtnToOutputWindow.delete(buttonId);
        }
        docBoxRunButtons.delete(id);
    }

    static setZIndex(id: string, zIndex: number) {
        document.getElementById(id).style.zIndex = `${zIndex}`;
    }

    static focusBox(id: string) {
        const box = DocumentationBox.openBoxes.find((box) => box.id == id);
        const boxElement = document.getElementById(box?.id);

        if (box && boxElement) {
            const boxHeader = boxElement.getElementsByClassName("doc-box-header")[0];
            boxHeader.classList.add("focused-header");

            const maxZIndex = Math.max(...DocumentationBox.openBoxes.map((box) => box.zIndex));
            const maxZIndexId = DocumentationBox.openBoxes.find((box) => box.zIndex == maxZIndex)?.id;

            box.zIndex = maxZIndex;
            box.isFocused = true;
            DocumentationBox.setZIndex(box.id, box.zIndex);

            DocumentationBox.openBoxes.forEach((box) => {
                if (box.id != id) {
                    box.isFocused = false;

                    if (maxZIndexId != id && box.zIndex != INITIAL_Z_INDEX) box.zIndex--;
                    DocumentationBox.setZIndex(box.id, box.zIndex);
                }
            });
        }
    }
}

class DocBoxMeta {
    id: string;
    isFocused: boolean;
    zIndex: number;

    constructor(id: string, isFocused: boolean, zIndex: number) {
        this.id = id;
        this.isFocused = isFocused;
        this.zIndex = zIndex;
    }
}

function createImage(image): HTMLDivElement {
    const tableElement = document.createElement("div");
    tableElement.classList.add("block-vs-text-table-container");
    const tableHeader = document.createElement("div");
    tableHeader.classList.add("block-vs-text-table-header");
    tableElement.appendChild(tableHeader);

    const blockHeader = document.createElement("span");
    blockHeader.innerText = "block-based";
    blockHeader.classList.add("block-based-header");
    tableHeader.appendChild(blockHeader);

    const textHeader = document.createElement("span");
    textHeader.innerText = "text-based";
    textHeader.classList.add("text-based-header");
    tableHeader.appendChild(textHeader);

    const imageContainer = document.createElement("div");
    imageContainer.classList.add("image-container");

    const blockImage = document.createElement("img");
    blockImage.src = image["block-based-image"];
    blockImage.alt = image.alt;
    blockImage.classList.add("block-image");
    imageContainer.appendChild(blockImage);

    const textImage = document.createElement("img");
    textImage.src = image["text-based-image"];
    textImage.alt = image.alt;
    textImage.classList.add("text-image");
    imageContainer.appendChild(textImage);

    tableElement.appendChild(imageContainer);

    return tableElement;
}

function createExample(item): [HTMLDivElement, string[], editor.IStandaloneCodeEditor] {
    const runBtns = [];

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

    runBtnToOutputWindow.set(runButton.id, consoleOutput.id);
    clearConsoleButton.addEventListener("click", () => {
        clearConsole(consoleOutput.id);
    });
    runBtns.push(runButton.id);

    const codeEditor = editor.create(exampleEditor, {
        folding: false,
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

    return [editorContainer, runBtns, codeEditor];
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
