import { editor } from "monaco-editor";
import { nova, runBtnToOutputWindow } from "../index";
import { attachPyodideActions, codeString } from "../pyodide-js/pyodide-controller";
import { addTextToConsole, clearConsole, CONSOLE_ERR_TXT_CLASS } from "../pyodide-ts/pyodide-ui";

const INITIAL_Z_INDEX = 500;

export const docBoxRunButtons = new Map<string, string[]>();

export class ExecutableCode {
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

                attachPyodideActions(
                    (() => {
                        const actions = [];

                        for (const buttonId of ex[1]) {
                            actions.push((pyodideController) => {
                                const button = document.getElementById(buttonId);

                                button.addEventListener("click", () => {
                                    try {
                                        nova.globals.lastPressedRunButtonId = button.id;

                                        clearConsole(ex[3]);
                                        pyodideController.runPython(codeString(ex[2].getValue()));
                                    } catch (err) {
                                        console.error("Unable to run python code");

                                        addTextToConsole(
                                            runBtnToOutputWindow.get(button.id),
                                            err,
                                            CONSOLE_ERR_TXT_CLASS
                                        );
                                    }
                                });
                            });
                        }

                        return actions;
                    })(),
                    []
                );
            } else if (item.hasOwnProperty("block-based-image")) {
                docBody.appendChild(createImage(item));
            }
        }

        window.addEventListener("mousedown", function (e) {
            if (container.contains(e.target as Element)) ExecutableCode.focusBox(container.id);
            else headerDiv.classList.remove("focused-header");
        });

        closeButton.onclick = () => {
            ExecutableCode.closeBox(container.id);
        };

        document.addEventListener("keydown", (ev) => {
            if (ev.key == "Escape") {
                ExecutableCode.pressedEscape = true;
            }
        });

        document.addEventListener("keyup", (ev) => {
            if (ev.key == "Escape" && ExecutableCode.pressedEscape) {
                const focusedBox = ExecutableCode.openBoxes.find((box) => box.isFocused);
                if (focusedBox) ExecutableCode.closeBox(focusedBox.id);

                ExecutableCode.pressedEscape = false;
            }
        });

        ExecutableCode.addNewBox(container.id);
    }

    static getNewConsoleId(): string {
        return "console-id-" + ExecutableCode.exampleCounter++;
    }

    static addNewBox(id: string) {
        let newZIndex = INITIAL_Z_INDEX;

        if (ExecutableCode.openBoxes.length > 0) {
            newZIndex = Math.max(...ExecutableCode.openBoxes.map((box) => box.zIndex)) + 1;
        }

        ExecutableCode.openBoxes.push(new DocBoxMeta(id, true, newZIndex));
        ExecutableCode.setZIndex(id, newZIndex);
        ExecutableCode.focusBox(id);
    }

    static closeBox(id: string) {
        // should become the highest
        ExecutableCode.focusBox(id);

        document.getElementById(id).remove();
        ExecutableCode.openBoxes.splice(
            ExecutableCode.openBoxes.findIndex((box) => box.id == id),
            1
        );

        const maxZIndex = Math.max(...ExecutableCode.openBoxes.map((box) => box.zIndex));
        const maxZIndexId = ExecutableCode.openBoxes.find((box) => box.zIndex == maxZIndex)?.id;

        if (maxZIndexId) ExecutableCode.focusBox(maxZIndexId);

        for (const buttonId of docBoxRunButtons.get(id)) {
            runBtnToOutputWindow.delete(buttonId);
        }
        docBoxRunButtons.delete(id);
    }

    static setZIndex(id: string, zIndex: number) {
        document.getElementById(id).style.zIndex = `${zIndex}`;
    }

    static focusBox(id: string) {
        const box = ExecutableCode.openBoxes.find((box) => box.id == id);
        const boxElement = document.getElementById(box?.id);

        if (box && boxElement) {
            const boxHeader = boxElement.getElementsByClassName("doc-box-header")[0];
            boxHeader.classList.add("focused-header");

            const maxZIndex = Math.max(...ExecutableCode.openBoxes.map((box) => box.zIndex));
            const maxZIndexId = ExecutableCode.openBoxes.find((box) => box.zIndex == maxZIndex)?.id;

            box.zIndex = maxZIndex;
            box.isFocused = true;
            ExecutableCode.setZIndex(box.id, box.zIndex);

            ExecutableCode.openBoxes.forEach((box) => {
                if (box.id != id) {
                    box.isFocused = false;

                    if (maxZIndexId != id && box.zIndex != INITIAL_Z_INDEX) box.zIndex--;
                    ExecutableCode.setZIndex(box.id, box.zIndex);
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

export function createExample(example: string): [HTMLDivElement, string[], editor.IStandaloneCodeEditor, string] {
    const codeLines = example.split("\n").length;
    const runButtons = [];

    const editorContainer = document.createElement("div");
    editorContainer.classList.add("doc-editor-container");

    const editorHeader = document.createElement("div");
    editorHeader.innerText = "Example Code";
    editorHeader.classList.add("doc-editor-header");
    editorContainer.appendChild(editorHeader);

    const exampleEditor = document.createElement("div");
    exampleEditor.classList.add("doc-editor");
    exampleEditor.style.height = codeLines * 20 + "px";
    editorContainer.appendChild(exampleEditor);

    const exampleConsole = document.createElement("div");
    exampleConsole.classList.add("doc-example-console");
    editorContainer.appendChild(exampleConsole);

    const buttonContainer = document.createElement("div");
    buttonContainer.classList.add("doc-example-console-button-container");
    exampleConsole.appendChild(buttonContainer);

    const consoleId = ExecutableCode.getNewConsoleId();

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
    runButtons.push(runButton.id);

    const codeEditor = editor.create(exampleEditor, {
        folding: false,
        value: example,
        language: "python3.6",
        dimension: { width: 200, height: codeLines * 20 },
        minimap: {
            enabled: false,
        },
        overviewRulerLanes: 0,
        overviewRulerBorder: false,
        contextmenu: false,
        codeLens: false,
        dragAndDrop: false,
        mouseWheelScrollSensitivity: 0,
        automaticLayout: true,
        scrollBeyondLastLine: false,
        scrollbar: {
            vertical: "auto",
            horizontal: "auto",
            verticalSliderSize: 5,
            horizontalSliderSize: 5,
            scrollByPage: false,
        },
        occurrencesHighlight: false,
        fontSize: 14,
        lineHeight: 20,
    });

    codeEditor.onDidChangeModelContent(() => {
        resetConsoleButton.style.visibility = "visible";
    });

    resetConsoleButton.addEventListener("click", () => {
        codeEditor.setValue(example);
    });

    runButton.addEventListener("click", () => {
            consoleOutput.classList.add("console-output-open");
    });

	clearConsoleButton.addEventListener("click", () => {
		consoleOutput.classList.remove("console-output-open");
	})

    return [editorContainer, runButtons, codeEditor, consoleOutput.id];
}
