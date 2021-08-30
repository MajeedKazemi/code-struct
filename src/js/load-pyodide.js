export default new Promise(async $export => {
    const module = await Promise.resolve(
        {
            pyodideController: loadPyodide(
                { 
                    indexURL : "https://cdn.jsdelivr.net/pyodide/v0.18.0/full/", 
                    stdout: (text) => {
                        const console = document.getElementById("outputDiv")
                        console.appendChild("<br/>")
                        console.appendChild(text)
                    } 
                }
           )
        }
    );
    $export(module);
});