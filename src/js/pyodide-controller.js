import { CodeStatus } from "../editor/consts";
import { nova } from "../index";

const CONSOLE_TXT_CLASS = "consoleTxt";
const CONSOLE_ERR_TXT_CLASS = "consoleErrTxt";
const CONSOLE_WARN_TXT_CLASS = "consoleWarnTxt";

const jsModule = {
    inputPrompt: function (text) {
        return prompt(text);
    },
};

export const addTextToConsole = (text, styleClass) => {
    const outputArea = document.getElementById("outputDiv");
    outputArea.appendChild(document.createElement("br"));
    const textEm = document.createElement("div");
    textEm.classList.add(CONSOLE_TXT_CLASS);
    textEm.classList.add(styleClass);
    textEm.textContent = text;
    outputArea.appendChild(textEm);
};

export const clearConsole = () => {
    document.getElementById("outputDiv").innerHTML = "";
    addTextToConsole("Cleared console.");
};

let pyodideController;

(async () => {
    (await import("./load-pyodide")).default
        .then(
            (res) => {
                return res.pyodideController;
            },
            (err) => {
                console.error("Could not import load-pyodide");
                console.error(err);
            }
        )
        .then((res) => {
            pyodideController = res;

            //Configuring actions and pyodide
            //has to be done here otherwise no guarantee that pyodide has been loaded when the code below runs

            pyodideController.registerJsModule("jsModule", jsModule);

            const runCodeBtn = document.getElementById("runCodeBtn");
            runCodeBtn.addEventListener("click", () => {
                const codeStatus = nova.getCodeStatus(true);

                switch (codeStatus) {
                    case CodeStatus.Runnable:
                        const code = nova.editor.monaco.getValue();
                        try {
                            pyodideController.runPython(
                                `
								from jsModule import inputPrompt
								input = inputPrompt
								__builtins__.input = inputPrompt

								${code}
								`
                            );
                        } catch (err) {
                            console.error("Unable to run python code");
                            addTextToConsole(err, CONSOLE_ERR_TXT_CLASS);
                        }

                        break;

                    case CodeStatus.ContainsAutocompleteTkns:
                        addTextToConsole(
                            "Your code contains unfinished autocomplete elements. Remove or complete them to be able to run your code.",
                            CONSOLE_WARN_TXT_CLASS
                        );
                        break;

                    case CodeStatus.ContainsDraftMode:
                        addTextToConsole(
                            "Your code contains unfinished constructs. Complete the constructs to be able to run your code.",
                            CONSOLE_WARN_TXT_CLASS
                        );
                        break;

                    case CodeStatus.ContainsEmptyHoles:
                        addTextToConsole(
                            "Your code contains empty parts that expect to be filled with values. Fill these in order to be able to run your code.",
                            CONSOLE_WARN_TXT_CLASS
                        );
                        break;

                    case CodeStatus.Empty:
                        addTextToConsole(
                            "Your code is empty! Try inserting something from the toolbox.",
                            CONSOLE_WARN_TXT_CLASS
                        );
                        break;
                }
            });
        }),
        (err) => {
            console.error("Could not access pyodideController");
            console.error(err);
        };

    //OTHER CODE EXECUTION-RELATED FUNCTIONALITY

    document.getElementById("clearOutputBtn").addEventListener("click", () => {
        clearConsole();
    });
})();
