import Editor from "../editor/editor";
import { Module } from "../syntax-tree/ast";
import {Util} from "../utilities/util"

export class SuggestionsController{
    private static instance: SuggestionsController

    module: Module;
    editor: Editor;

    menuParent: HTMLDivElement;

    private constructor(){}

    static getInstance(){
        if(!SuggestionsController.instance){
            SuggestionsController.instance = new SuggestionsController();
        }

        return SuggestionsController.instance;
    }

    setInstance(module: Module, editor: Editor){
        this.module = module;
        this.editor = editor;
    }

    buildMenuOption(optionName: string, action: Function): HTMLDivElement{
        const optionParent = document.createElement("div");
        optionParent.classList.add("suggestionOptionParent");

        optionParent.addEventListener("mouseover", () => {
            console.log("not implemented")
            //change colour
            //display info
        });

        optionParent.addEventListener("click", () => {
            action();
        })

        const textNode = document.createElement("span");
        textNode.classList.add("suggestionOptionText");
        textNode.textContent = optionName;

        optionParent.appendChild(textNode);

        return optionParent;
    }

    buildMenu(inserts: Map<string, boolean>, keys: Array<string>, pos: any){
        this.menuParent = document.createElement("div");
        this.menuParent.classList.add("suggestionMenuParent");

        keys.forEach(key => {
            if(inserts.get(key)){
                this.menuParent.appendChild(
                    this.buildMenuOption(key, () => {this.module.insert(Util.getInstance().dummyToolboxConstructs.get(key))})
                );
            }
        })

        //TODO: These are the same values as the ones used for mouse offset by the Notifications so maybe make them shared in some util file
        this.menuParent.style.left = `${pos.left + document.getElementById("editor").offsetLeft}px`;
        this.menuParent.style.top = `${pos.top + parseFloat(window.getComputedStyle(document.getElementById("editor")).paddingTop)}px`;

        document.getElementById("editor").appendChild(this.menuParent);
    }

    removeMenu(){
        document.getElementById("editor").removeChild(this.menuParent);
        this.menuParent = null;
    }
}