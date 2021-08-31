const { addTextToConsole } = require("./pyodide-controller");

export default new Promise(async ($export) => {
    const module = await Promise.resolve({
        pyodideController: loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.18.0/full/",
            stdout: (text) => {
                addTextToConsole(text);
            },
        }),
    });
    $export(module);
});
