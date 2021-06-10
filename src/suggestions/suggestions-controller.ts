import Editor from "../editor/editor";
import { Module } from "../syntax-tree/ast";
import {ConstructKeys, Util} from "../utilities/util"
import { ConstructDoc } from "./construct-doc";

/**
 * Singleton controlling the suggestion menu. Represents a list of options available for insertion at the current focused node with the ability to display them to the user.
 */
export class SuggestionsController{
    private static instance: SuggestionsController
    private selectedOptionIndex = -1;
    private optionActions = [];

    private optionElementClass = "suggestionOptionParent";
    private menuElementId = "suggestionMenuParent";
    private optionTextElementClass = "suggestionOptionText";
    private selectedOptionElementClass = "selectedSuggestionOptionParent";

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

    /**
     * Add an option to this menu.
     * 
     * @param optionName display name of option
     * @param action     function to be executed when this option is clicked or selected through ENTER
     * @param doc        documentation that is displayed when the option is hovered over or selected (selection is for keys; hover is for mouse)
     * @returns 
     */
    addMenuOption(optionName: string, action: Function, doc?: ConstructDoc): HTMLDivElement{
        const optionParent = document.createElement("div");
        optionParent.classList.add(this.optionElementClass);

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
        textNode.classList.add(this.optionTextElementClass);
        textNode.textContent = optionName;

        optionParent.appendChild(textNode);

        this.optionActions.push(action);

        return optionParent;
    }

    /**
     * Construct a menu with ALL valid insertions at the focused node as options at the given location within the editor.
     * 
     * If need to construct a menu with specific options use buildCustomMenu.
     * 
     * @param inserts a map parallel to Util.dummyToolboxConstructs that states whether the given construct is possible to insert at the focused location.
     * @param pos     (x, y) of top left corner of the selected construct/hole in pixels. Only necessary if need a specific position. 
     *                The object will calculate its position itself otherwise.
     */
    buildMenu(inserts: Map<ConstructKeys, boolean>, pos: any = {left: 0, top: 0}){
        if(this.menuParent){
            this.removeMenu();
        }

        this.menuParent = document.createElement("div");
        this.menuParent.id = this.menuElementId;
        document.getElementById("editor").appendChild(this.menuParent);

        Object.keys(ConstructKeys).forEach(key => {
            if(inserts.get(ConstructKeys[key])){
                this.menuParent.appendChild(
                    this.addMenuOption(ConstructKeys[key], () => {this.module.insert(Util.getInstance().dummyToolboxConstructs.get(ConstructKeys[key]))}, Util.getInstance().constructDocs.get(ConstructKeys[key]))
                );
            }
        })

        //TODO: These are the same values as the ones used for mouse offset by the Notifications so maybe make them shared in some util file
        this.menuParent.style.left = `${pos.left + document.getElementById("editor").offsetLeft}px`;
        this.menuParent.style.top = `${pos.top + parseFloat(window.getComputedStyle(document.getElementById("editor")).paddingTop)}px`;

        //TODO: No good way of separating responsibility completely because ready doc objects are stored in util instead of being created here.
        //I guess, it is always possible to have a list of active docs and loop through it here and update their positions instead of 
        //using the static method to update them all. Do that in case this ever slows down anything.
        ConstructDoc.updateDocsLeftOffset(document.getElementById("editor").offsetLeft + document.getElementById(this.menuElementId).offsetWidth);
    }

    /**
     * Construct a menu with the provided options at the given location within the editor.
     * 
     * @param options constructs that should be displayed as options for insertion by the menu as keys into Util.ConstructKeys
     * @param pos     (x, y) of top left corner of the selected construct/hole in pixels. Only necessary if need a specific position. 
     *                The object will calculate its position itself otherwise.
     */
    buildCustomMenu(options: Array<ConstructKeys>, pos: any = {left: 0, top: 0}){
        if(this.menuParent){
            this.removeMenu();
        }

        this.menuParent = document.createElement("div");
        this.menuParent.id = this.menuElementId;
        document.getElementById("editor").appendChild(this.menuParent);

        options.forEach((key) => {
            this.menuParent.appendChild(
                this.addMenuOption(key, () => {this.module.insert(Util.getInstance().dummyToolboxConstructs.get(key))}, Util.getInstance().constructDocs.get(key))
            );
        })

         //TODO: These are the same values as the ones used for mouse offset by the Notifications so maybe make them shared in some util file
         this.menuParent.style.left = `${pos.left + document.getElementById("editor").offsetLeft}px`;
         this.menuParent.style.top = `${pos.top + parseFloat(window.getComputedStyle(document.getElementById("editor")).paddingTop)}px`;
 
         //TODO: No good way of separating responsibility completely because ready doc objects are stored in util instead of being created here.
         //I guess, it is always possible to have a list of active docs and loop through it here and update their positions instead of 
         //using the static method to update them all. Do that in case this ever slows down anything.
         ConstructDoc.updateDocsLeftOffset(document.getElementById("editor").offsetLeft + document.getElementById(this.menuElementId).offsetWidth);
    }

    removeMenu(){
        document.getElementById("editor").removeChild(this.menuParent);
        this.menuParent = null;
        this.optionActions = [];
        this.selectedOptionIndex = -1;
    }

    isMenuActive(){
        return this.menuParent ? true : false;
    }

    //Methods for keyboard interactions with the menu
    selectOptionBelow(){
        const options = this.menuParent.getElementsByClassName(this.optionElementClass);

        if(this.selectedOptionIndex != -1 && this.selectedOptionIndex != options.length){
            options[this.selectedOptionIndex].classList.remove(this.selectedOptionElementClass);
        }

        this.selectedOptionIndex++;

        if(this.selectedOptionIndex == options.length){
            this.selectedOptionIndex = 0;
        }
        
        options[this.selectedOptionIndex].classList.add(this.selectedOptionElementClass);

        if(this.selectedOptionIndex == 0){
            this.menuParent.scrollTop = 0;
        }
        else{
            this.menuParent.scrollTop += (options[0] as HTMLDivElement).offsetHeight;
        }
    }

    selectOptionAbove(){
        const options = this.menuParent.getElementsByClassName(this.optionElementClass);

        if(this.selectedOptionIndex != -1 && this.selectedOptionIndex != options.length){
            options[this.selectedOptionIndex].classList.remove(this.selectedOptionElementClass);
        }

        this.selectedOptionIndex--;

        if(this.selectedOptionIndex < 0){
            this.selectedOptionIndex = options.length - 1;
        }
        
        options[this.selectedOptionIndex].classList.add(this.selectedOptionElementClass);

        if(this.selectedOptionIndex == options.length - 1){
            this.menuParent.scrollTop = (options[0] as HTMLDivElement).offsetHeight * options.length;
        }
        else{
            this.menuParent.scrollTop -= (options[0] as HTMLDivElement).offsetHeight;
        }
    }

    selectSuggestion(){
        this.optionActions[this.selectedOptionIndex]();    
        this.selectedOptionIndex = -1;
    }
}