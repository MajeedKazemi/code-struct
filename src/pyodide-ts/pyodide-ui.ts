export const CONSOLE_TXT_CLASS = "consoleTxt";
export const CONSOLE_ERR_TXT_CLASS = "consoleErrTxt";
export const CONSOLE_WARN_TXT_CLASS = "consoleWarnTxt";


export const addTextToConsole = (text, styleClass = "", consoleId) => {
    const outputArea = document.getElementById(consoleId);
    outputArea.appendChild(document.createElement("br"));
    const textEm = document.createElement("div");
    textEm.classList.add(CONSOLE_TXT_CLASS);
    textEm.classList.add(styleClass);
    textEm.textContent = text;
    outputArea.appendChild(textEm);
};

export const clearConsole = (consoleId) => {
    document.getElementById(consoleId).innerHTML = "";
    addTextToConsole("Cleared console.", "", consoleId);
};



