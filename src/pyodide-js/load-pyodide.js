import { addTextToConsole, CONSOLE_TXT_CLASS } from "../pyodide-ts/pyodide-ui";
import {nova, runBtnToOutputWindow} from "../index"

let exportPromise;
if(JSON.parse(process.env.EXECUTE_CODE)){
    exportPromise = new Promise(async ($export) => {
        const module = await Promise.resolve({
            pyodideController: loadPyodide({
                indexURL: "https://cdn.jsdelivr.net/pyodide/v0.18.0/full/",
                stdout: (text) => {
                    let consoleId = runBtnToOutputWindow.get(nova.globals.lastPressedRunButtonId) ?? "outputDiv";
                    addTextToConsole(consoleId, text, CONSOLE_TXT_CLASS);
                },
            }),
        });
        $export(module);
    });
}

export default exportPromise