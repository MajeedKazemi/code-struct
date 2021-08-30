import { nova } from "../index";

const jsModule = {
	inputPrompt: function(text){
		return prompt(text)
	}
}

export const addTextToConsole = (text) => {
	const outputArea = document.getElementById("outputDiv")
	outputArea.appendChild(document.createElement("br"))
	const textEm = document.createElement("div");
	textEm.classList.add("consoleTxt")
	textEm.textContent = text
	outputArea.appendChild(textEm)
}

export const clearConsole = () => {
	document.getElementById("outputDiv").innerHTML = "";
	addTextToConsole("Cleared console.")
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
			try{
				pyodideController.runPython(
`
from jsModule import inputPrompt
input = inputPrompt
__builtins__.input = inputPrompt
${code}
`
				)
			} catch(err){
				console.error("Unable to run python code")
				addTextToConsole(err)
			}
		})
		
	}), (err) => {
		console.error("Could not access pyodideController")
		console.error(err)
	}


	document.getElementById("clearOutputBtn").addEventListener("click", () => {
		clearConsole();
	})
	

	
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
