import { nova } from "../index";

const jsModule = {
	inputPrompt: function(text){
		return prompt(text)
	}
}


let pyodideController;
(async () => {
	(
		await import('./load-pyodide')
	).default.then((res) => {
		return res.pyodideController
	}, (err) => {
		console.error("Could not import load-pyodide")
		console.error(err)
	}).then((res) => {
		pyodideController = res;

		pyodideController.registerJsModule("jsModule", jsModule)

		const runCodeBtn = document.getElementById("runCodeBtn")
		runCodeBtn.addEventListener('click', () => {
			const code = nova.editor.monaco.getValue();
			console.log(pyodideController.runPython(
`
from jsModule import inputPrompt
input = inputPrompt
__builtins__.input = inputPrompt
${code}
`
			))})
		
	}), (err) => {
		console.error("Could not access pyodideController")
		console.error(err)
	}


	
	

	
})()
/*
*/

//(async () => {
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
//})()
