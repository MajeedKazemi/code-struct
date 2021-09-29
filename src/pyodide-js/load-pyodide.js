import { addTextToConsole, CONSOLE_TXT_CLASS } from "../pyodide-ts/pyodide-ui";

let exportPromise;
if(JSON.parse(process.env.EXECUTE_CODE)){
    exportPromise = new Promise(async ($export) => {
        const module = await Promise.resolve({
            pyodideController: loadPyodide({
                indexURL: "https://cdn.jsdelivr.net/pyodide/v0.18.0/full/",
                stdout: (text) => {
                    addTextToConsole(text, CONSOLE_TXT_CLASS);
                },
            }),
        });
        $export(module);
    });
}

export default exportPromise