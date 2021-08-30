export default new Promise(async $export => {
    const module = await Promise.resolve(
        {
            pyodideController: loadPyodide(
                { 
                    indexURL : "https://cdn.jsdelivr.net/pyodide/v0.18.0/full/", 
                    stdout: (text) => {
                        const outputArea = document.getElementById("outputDiv")
                        outputArea.appendChild(document.createElement("br"))
                        const textEm = document.createElement("div");
                        textEm.textContent = text
                        outputArea.appendChild(textEm)
                    } 
                }
           )
        }
    );
    $export(module);
});