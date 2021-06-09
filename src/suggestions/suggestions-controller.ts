import Editor from "../editor/editor";
import { Module } from "../syntax-tree/ast";
import {Util} from "../utilities/util"
import { ConstructDoc } from "./construct-doc";

/**
 * Singleton controlling the suggestion menu. Represents a list of options available for insertion at the current focused node with the ability to display them to the user.
 */
export class SuggestionsController{
    private static instance: SuggestionsController
    private selectedOptionIndex = -1;
    private optionActions = [];

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

    addMenuOption(optionName: string, action: Function, doc?: ConstructDoc): HTMLDivElement{
        const optionParent = document.createElement("div");
        optionParent.classList.add("suggestionOptionParent");

        optionParent.addEventListener("mouseover", () => {
            if(doc){
                doc.resetScroll();
                doc.show();
            }
        });

        optionParent.addEventListener("mouseleave", () => {
            if(doc){
                doc.hide();
            }
        });

        optionParent.addEventListener("click", () => {
            action();
        })

        const textNode = document.createElement("span");
        textNode.classList.add("suggestionOptionText");
        textNode.textContent = optionName;

        optionParent.appendChild(textNode);

        this.optionActions.push(action);

        return optionParent;
    }

    buildMenu(inserts: Map<string, boolean>, keys: Array<string>, pos: any){
        this.menuParent = document.createElement("div");
        this.menuParent.id = "suggestionMenuParent";
        document.getElementById("editor").appendChild(this.menuParent);

        keys.forEach(key => {
            if(inserts.get(key)){
                this.menuParent.appendChild(
                    this.addMenuOption(key, () => {this.module.insert(Util.getInstance().dummyToolboxConstructs.get(key))}, Util.getInstance().constructDocs.get(key))
                );
            }
        })

        //TODO: These are the same values as the ones used for mouse offset by the Notifications so maybe make them shared in some util file
        this.menuParent.style.left = `${pos.left + document.getElementById("editor").offsetLeft}px`;
        this.menuParent.style.top = `${pos.top + parseFloat(window.getComputedStyle(document.getElementById("editor")).paddingTop)}px`;

        //TODO: No good way of separating responsibility completely because ready doc objects are stored in util instead of being created here.
        //I guess, it is always possible to have a list of active docs and loop through it here and update their positions instead of 
        //using the static method to update them all. Do that in case this ever slows down anything.
        ConstructDoc.updateDocsLeftOffset(document.getElementById("editor").offsetLeft + document.getElementById("suggestionMenuParent").offsetWidth);
    }

    removeMenu(){
        document.getElementById("editor").removeChild(this.menuParent);
        this.menuParent = null;
    }

    isMenuActive(){
        return this.menuParent ? true : false;
    }

    selectOptionBelow(){
        const options = this.menuParent.getElementsByClassName("suggestionOptionParent");

        if(this.selectedOptionIndex != -1 && this.selectedOptionIndex != options.length){
            options[this.selectedOptionIndex].classList.remove("selectedSuggestionOptionParent");
        }

        this.selectedOptionIndex++;

        if(this.selectedOptionIndex == options.length){
            this.selectedOptionIndex = 0;
        }
        
        options[this.selectedOptionIndex].classList.add("selectedSuggestionOptionParent");

        if(this.selectedOptionIndex == 0){
            this.menuParent.scrollTop = 0;
        }
        else{
            this.menuParent.scrollTop += (options[0] as HTMLDivElement).offsetHeight;
        }
    }

    selectOptionAbove(){
        const options = this.menuParent.getElementsByClassName("suggestionOptionParent");

        if(this.selectedOptionIndex != -1 && this.selectedOptionIndex != options.length){
            options[this.selectedOptionIndex].classList.remove("selectedSuggestionOptionParent");
        }

        this.selectedOptionIndex--;

        if(this.selectedOptionIndex < 0){
            this.selectedOptionIndex = options.length - 1;
        }
        
        options[this.selectedOptionIndex].classList.add("selectedSuggestionOptionParent");

        if(this.selectedOptionIndex == options.length - 1){
            this.menuParent.scrollTop = (options[0] as HTMLDivElement).offsetHeight * options.length;
        }
        else{
            this.menuParent.scrollTop -= (options[0] as HTMLDivElement).offsetHeight;
        }
    }

    selectSuggestion(){
        this.optionActions[this.selectedOptionIndex]();        
    }
}