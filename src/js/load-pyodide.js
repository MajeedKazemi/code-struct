
(async () => {
   /* const pyodide = await loadPyodide({ indexURL : "https://cdn.jsdelivr.net/pyodide/v0.18.0/full/" }).catch(err => {
        console.error("Could not load pyodide");
        console.error(err);
    });*/

    /*
    console.log(pyodide.runPython(`
    a = input('Enter a number')
    print(a)
`));*/


    //console.log(pyodide)
})()


export default new Promise(async $export => {
    const module = await Promise.resolve(
      {pyodideController: loadPyodide({ indexURL : "https://cdn.jsdelivr.net/pyodide/v0.18.0/full/" })}
    );
    $export(module);
});