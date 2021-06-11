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

export class MenuController{
    private static instance: MenuController;

    static optionElementClass: string = "suggestionOptionParent";

    module: Module;
    editor: Editor;

    private constructor(){}

    static getInstance(){
        if(!MenuController.instance){
            MenuController.instance = new MenuController();
        }

        return MenuController.instance;
    }

    setInstance(module: Module, editor: Editor){
        this.module = module;
        this.editor = editor;
    }
}

export class Menu{
    private options: MenuOption[] = [];

    static menuCount = 0;
    static idPrefix = "suggestion-menu-";

    childMenus = []
    parentMenu = null;

    private isActive: boolean = false;
    private isFocused: boolean = false;
    private isOpen: boolean = false;

    htmlElement: HTMLDivElement;

    constructor(options: Map<string, Function>, keys: string[]){
        this.htmlElement = document.createElement("div");
        this.htmlElement.classList.add(SuggestionsController2.menuElementClass);
        this.htmlElement.id = `${Menu.idPrefix}${Menu.menuCount}`;
        document.getElementById("editor").appendChild(this.htmlElement);

        Menu.menuCount++;

        keys.forEach((key => {
            const option = new MenuOption(keys.indexOf(key), key, null, this, Util.getInstance().constructDocs.get(key), options.get(key));
            this.options.push(option);
            option.attachToParentMenu(this);
            this.htmlElement.appendChild(option.htmlElement);
        }).bind(this))

        this.htmlElement.addEventListener("mouseover", () => {
            this.htmlElement.style.visibility = "visible"
        })
    }

    open(){
        this.isOpen = true;
        this.htmlElement.style.visibility = "visible";
    }

    close(){
        this.isOpen = false;
        this.htmlElement.style.visibility = "hidden";
    }

    linkMenuThroughOption(parent: Menu, child: Menu, optionInParent: string){
        const option = parent.options.filter(option => option.text === optionInParent)[0]
        option.linkToChildMenu(child);
        option.selectAction = null;
        child.close();
    }

    isMenuOpen(){
        return this.isOpen;
    }

    isMenuActive(){
        return this.isActive;
    }

    setActive(active: boolean){
        this.isActive = active;
    }

    setChildMenus(menus: Menu[]){
        menus.forEach(((menu) => {
            menu.parentMenu = this;
        }).bind(this))

        this.childMenus = menus;
    }

    addChildMenu(menu: Menu){
        menu.parentMenu = this;
        this.childMenus.push(menu);
    }

    static collapseChildren(menu: Menu){
        const activeChildren = menu.childMenus.filter(menu => menu.isOpen)

        if(activeChildren.length > 0){
            activeChildren.forEach(menu => {
                Menu.collapseChildren(menu);
                menu.close();
            })
        }
    }

    removeFromDOM(){
        document.getElementById("editor").removeChild(this.htmlElement);
    }
}

export class MenuOption{
    text: string;
    private childMenu: Menu;
    private parentMenu: Menu;
    doc: ConstructDoc;
    htmlElement: HTMLDivElement;
    selectAction: Function;
    indexInParent: number;

    constructor(indexInParent:number, text: string = "Option Text", childMenu?: Menu, parentMenu?: Menu, doc?: ConstructDoc, selectAction?: Function){
        this.text = text;
        this.childMenu = childMenu;
        this.parentMenu = parentMenu;
        this.doc = doc;
        this.indexInParent = indexInParent;

        if(!selectAction){
            this.selectAction = () => {console.log("Selected " + this.text)};
        }
        else{
            this.selectAction = selectAction;
        }

        this.htmlElement = document.createElement("div");
        this.htmlElement.classList.add(SuggestionsController2.optionElementClass);
        
        const textNode = document.createElement("span");
        textNode.classList.add(SuggestionsController2.optionTextElementClass);
        textNode.textContent = text;
        this.htmlElement.appendChild(textNode);

        this.htmlElement.addEventListener("mouseenter", (() => {
            if(this.childMenu){
                Menu.collapseChildren(this.parentMenu);
                this.childMenu.open();
                this.childMenu.htmlElement.style.top = `${this.htmlElement.offsetTop + this.parentMenu.htmlElement.offsetTop}px`;
            }
            else{
                Menu.collapseChildren(this.parentMenu);
            }

            if(this.doc){
                this.doc.resetScroll();
                this.doc.show();
            }

            this.parentMenu.setActive(true);
        }).bind(this))

        this.htmlElement.addEventListener("click", () => {
            this.select();
        })
    }

    select(){
        if(this.childMenu){
            this.childMenu.open();
        }
        else{
            this.selectAction();
        }
    }

    linkToChildMenu(child: Menu){
        this.childMenu = child;

        this.htmlElement.addEventListener("mouseenter", () => {
            this.childMenu.open();
        });
    }

    attachToParentMenu(menu: Menu){
        this.parentMenu = menu;
    }

    hasChild(){
        return this.childMenu ? true : false;
    }

    getChildMenu(){
        return this.childMenu;
    }
}


export class SuggestionsController2{
    private static instance: SuggestionsController2

    static optionElementClass: string = "suggestionOptionParent";
    static menuElementClass: string = "suggestionMenuParent";
    static optionTextElementClass = "suggestionOptionText";

    module: Module;
    editor: Editor;

    menuActive = false;
    menus: Menu[] = [];

    private constructor(){}

    static getInstance(){
        if(!SuggestionsController2.instance){
            SuggestionsController2.instance = new SuggestionsController2();
        }

        return SuggestionsController2.instance;
    }

    setInstance(module: Module, editor: Editor){
        this.module = module;
        this.editor = editor;
    }

    buildNestedMenu(options: Array<ConstructKeys | string>[], nestingMap: Map<string, number[]>, pos: any = {left: 0, top: 0}){
        if(this.menus.length > 0){
            this.menus.forEach(menu => {
                menu.close();
                menu.removeFromDOM();
            })

            this.menus = [];
        }
        else if(options.length > 0){
            const menus = []
            options.forEach(menuOptions => {
                menus.push(this.buildMenu(menuOptions, pos));
            })
    
            //create menu tree
            options.forEach(menuOptions => {
                menuOptions.forEach(option => {
                    if(nestingMap.has(option)){
                        menus[nestingMap.get(option)[0]].linkMenuThroughOption(menus[nestingMap.get(option)[0]], menus[nestingMap.get(option)[1]], option);
                        
                        //update child's position based on how deep it is within tree
                        const childInitialLeft = parseFloat(menus[nestingMap.get(option)[1]].htmlElement.offsetLeft)
                        const offsetLeft = menus.reduce((offset, menu, i) => {
                            if(i < nestingMap.get(option)[0] + 1){
                                offset += menu.htmlElement.offsetWidth;
                            }
                            return offset;
                        }, 0)
                        menus[nestingMap.get(option)[1]].htmlElement.style.left = `${childInitialLeft + offsetLeft}px`
    
                        menus[nestingMap.get(option)[0]].addChildMenu(menus[nestingMap.get(option)[1]]);
                    }
                })
            })
    
            this.menus = menus;
        }
    }

    buildMenu(options: Array<ConstructKeys | string>, pos: any = {left: 0, top: 0}){
        if(options.length > 0){
        
            const menuOptions = new Map<string, Function>();
            options.forEach(option => {
                if(option in Object.keys(ConstructKeys).map(key => ConstructKeys[key])){
                    menuOptions.set(option as ConstructKeys, () => {this.module.insert(Util.getInstance().dummyToolboxConstructs.get(option as ConstructKeys))});
                }
                else{
                    menuOptions.set(option, null);
                }
            })
    
            const menu = new Menu(menuOptions, options);
    
            //TODO: These are the same values as the ones used for mouse offset by the Notifications so maybe make them shared in some util file
            menu.htmlElement.style.left = `${pos.left + document.getElementById("editor").offsetLeft}px`;
            menu.htmlElement.style.top = `${pos.top + parseFloat(window.getComputedStyle(document.getElementById("editor")).paddingTop)}px`;
    
            //TODO: No good way of separating responsibility completely because ready doc objects are stored in util instead of being created here.
            //I guess, it is always possible to have a list of active docs and loop through it here and update their positions instead of 
            //using the static method to update them all. Do that in case this ever slows down anything.
            ConstructDoc.updateDocsLeftOffset(document.getElementById("editor").offsetLeft + document.getElementById(`${Menu.idPrefix}${Menu.menuCount - 1}`).offsetWidth);

            this.menuActive = true;

            return menu;
        }

        return null
    }

    showTopLevelMenu(){
        if(this.menus.length > 0){
            this.menus[0].open();
            this.menuActive = true;
        }
    }

    removeMenus(){
        this.menus.forEach((menu) => {
            document.getElementById("editor").removeChild(menu.htmlElement);
        })
    }
}