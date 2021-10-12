import { CodeStatus } from "../editor/consts";
import { nova } from "../index";
import { clearConsole, CONSOLE_ERR_TXT_CLASS, CONSOLE_WARN_TXT_CLASS } from "../pyodide-ts/pyodide-ui";

const jsModule = {
    inputPrompt: function (text) {
        return prompt(text);
    },
};

export const codeString = (code) => {
    return `from jsModule import inputPrompt\ninput = inputPrompt\n__builtins__.input = inputPrompt\n${code}\n`
}

export const attachPyodideActions = (afterPyodideLoadedActions, otherActions) => {
    if (JSON.parse(process.env.EXECUTE_CODE)) {
        (async () => {
            (await import("../pyodide-js/load-pyodide")).default
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
                    let pyodideController = res;

                    for (let i = 0; i < afterPyodideLoadedActions.length; i++) {
                        afterPyodideLoadedActions[i](pyodideController);
                    }
                }),
                (err) => {
                    console.error("Could not access pyodideController");
                    console.error(err);
                };

            for (let i = 0; i < otherActions.length; i++) {
                otherActions[i]();
            }
        })();
    }
}

const attachMainConsoleRun = (pyodideController) => {
    const runCodeBtn = document.getElementById("runCodeBtn");
    runCodeBtn.addEventListener("click", () => {
        const codeStatus = nova.getCodeStatus(true);

        switch (codeStatus) {
            case CodeStatus.Runnable:
                const code = nova.editor.monaco.getValue();
                try {
                    nova.globals.lastPressedRunButtonId = "runCodeBtn";
                    pyodideController.runPython(
                        codeString(code)
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
}

const attachMainConsoleClear = () => {
    //this is only for the main console so the id is hard-coded
    document.getElementById("clearOutputBtn").addEventListener("click", () => {
        clearConsole("outputDiv");
    });
}

attachPyodideActions([(controller) => {
    controller.registerJsModule("jsModule", jsModule);
}, attachMainConsoleRun], [attachMainConsoleClear]);