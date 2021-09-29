import {runBtnToOutputWindow} from "../index"

export const CONSOLE_TXT_CLASS = "consoleTxt";
export const CONSOLE_ERR_TXT_CLASS = "consoleErrTxt";
export const CONSOLE_WARN_TXT_CLASS = "consoleWarnTxt";


export const addTextToConsole = (consoleId: string, text: string, styleClass: string = CONSOLE_TXT_CLASS) => {
    const outputArea = document.getElementById(consoleId);
    outputArea.appendChild(document.createElement("br"));
    const textEm = document.createElement("div");
    textEm.classList.add(CONSOLE_TXT_CLASS);
    textEm.classList.add(styleClass);
    textEm.textContent = text;
    outputArea.appendChild(textEm);
};

export const clearConsole = (consoleId: string) => {
    document.getElementById(consoleId).innerHTML = "";
    addTextToConsole(consoleId, "Cleared console.", CONSOLE_TXT_CLASS);
};



