import Editor from "../editor/editor";
import { Module } from "../syntax-tree/ast";
import {constructKeys, ConstructKeys, Util} from "../utilities/util"
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


//TODO: Rename suggestion controller 2 to this
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

//a menu with options
export class Menu{
    //used for setting id of each new menu's DOM element
    static menuCount = 0;
    static idPrefix = "suggestion-menu-";

    private options: MenuOption[] = [];
    //menu has been entered once
    private isMenuActive: boolean = false;
    //menu is currently being hovered over or navigated with arrow keys
    private isFocused: boolean = false;
    private isMenuOpen: boolean = false;

    indexInController: number = -1;

    //tree structure
    children: Menu[] = []
    parentMenu = null;

    htmlElement: HTMLDivElement;

    constructor(options: Map<string, Function>, keys: string[]){
        this.htmlElement = document.createElement("div");
        this.htmlElement.classList.add(SuggestionsController2.menuElementClass);
        this.htmlElement.id = `${Menu.idPrefix}${Menu.menuCount}`;
        document.getElementById("editor").appendChild(this.htmlElement);

        Menu.menuCount++;

        keys.forEach((key => {
            const option = new MenuOption(keys.indexOf(key), key, null, this, Util.getInstance().constructDocs.get(key), options.get(key));
            option.attachToParentMenu(this);

            this.options.push(option);
            this.htmlElement.appendChild(option.htmlElement);
        }).bind(this))

        this.htmlElement.addEventListener("mouseover", () => {
            this.htmlElement.style.visibility = "visible"
        })
    }

    open(){
        this.isMenuOpen = true;
        this.htmlElement.style.visibility = "visible";
    }

    close(){
        this.isMenuOpen = false;
        this.htmlElement.style.visibility = "hidden";
    }

    //Links two menus through the given optionInParent
    static linkMenuThroughOption(parent: Menu, child: Menu, optionInParent: string){
        const option = parent.options.filter(option => option.text === optionInParent)[0]
        option.linkToChildMenu(child);
        option.selectAction = null;
        child.close();

        child.htmlElement.style.left = `${parent.htmlElement.offsetWidth + parent.htmlElement.offsetLeft}px`


        parent.addChildMenu(child);
    }

    isOpen(){
        return this.isMenuOpen;
    }

    isActive(){
        return this.isMenuActive;
    }

    setActive(active: boolean){
        this.isMenuActive = active;
    }

    //for bulk setting children
    setChildMenus(menus: Menu[]){
        menus.forEach(((menu) => {
            menu.parentMenu = this;
        }).bind(this))

        this.children = menus;
    }

    addChildMenu(menu: Menu){
        menu.parentMenu = this;
        this.children.push(menu);
    }

    //close nested menus up to menu starting at bottom of tree
    static closeChildren(menu: Menu){
        const activeChildren = menu.children.filter(menu => menu.isOpen)

        if(activeChildren.length > 0){
            activeChildren.forEach(menu => {
                Menu.closeChildren(menu);
                menu.close();
            })
        }
    }

    //sets all menus that have a single option that links to another set of options
    //to instead contain the set being linked to without the link option
    //In other words, collapse unnecessary menus starting at menu
    static collapseSingleOptionLinkMenus(menu: Menu){
        if(menu.children.length > 0){
            for(let i = 0; i < menu.children.length; i++){
                Menu.collapseSingleOptionLinkMenus(menu.children[i]);

                if(menu.children[i].options.length == 1 && menu.children[i].options[0].getChildMenu() && menu.parentMenu != null){
                    const grandparent = menu.children[i].parentMenu;
                    const linkOption = grandparent.options.filter(option => option.child === menu.children[i])[0]

                    menu.children[i] = menu.children[i].options[0].getChildMenu();
                    menu.children[i].parentMenu = grandparent;
                    linkOption.child = menu.children[i];
                }
            }
            if(menu.options.length == 1 && menu.options[0].getChildMenu() && menu.parentMenu != null){
                Menu.collapseSingleOptionLinkMenus(menu.parentMenu);
                return
            }
        }

        return
    }

    //indent child menus of menu
    static adjustOffsetWidth(menu: Menu, offset: number = 0){
        if(menu.children.length > 0){
            let adjustment = offset + menu.htmlElement.offsetWidth;
            menu.children.forEach(child => {
                child.htmlElement.style.left = `${adjustment}px`;

                if(child.children.length > 0){
                    Menu.adjustOffsetWidth(child, adjustment);
                }
            })
        }
        else{

        }
    }

    removeFromDOM(){
        document.getElementById("editor").removeChild(this.htmlElement);
    }
}

export class MenuOption{
    //menu that this option links to
    private childMenu: Menu;

    //menu within which this option is contained
    private parentMenu: Menu;

    text: string;
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
                Menu.closeChildren(this.parentMenu);
                this.childMenu.open();
                this.childMenu.htmlElement.style.top = `${this.htmlElement.offsetTop + this.parentMenu.htmlElement.offsetTop - this.parentMenu.htmlElement.scrollTop}px`;
            }
            else{
                Menu.closeChildren(this.parentMenu);
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
    static optionTextElementClass: string = "suggestionOptionText";
    static selectedOptionElementClass: string = "selectedSuggestionOptionParent";

    module: Module;
    editor: Editor;
    indexOfTopMenu: number = -1;

    focusedMenuIndex: number = 0;
    focusedOptionInedx: number = -1;

    menus: Menu[] = [];

    categoryLevels: Map<string, Array<string>> = new Map<string, Array<string>>([
        ["Top", ["Literals", "Function Calls", "Operators", "Control Statements", "Member Function Calls", "Other"]],
        ["Literals", [ConstructKeys.StringLiteral, ConstructKeys.NumberLiteral, ConstructKeys.True, ConstructKeys.False, ConstructKeys.ListLiteral]],
        ["Function Calls", [ConstructKeys.PrintCall, ConstructKeys.LenCall, ConstructKeys.RandintCall, ConstructKeys.RangeCall]],
        ["Operators", ["Arithmetic", "Boolean", "Comparator"]],
        ["Control Statements", [ConstructKeys.If, ConstructKeys.Elif, ConstructKeys.Else, ConstructKeys.While, ConstructKeys.For]],
        ["Arithmetic", [ConstructKeys.Addition, ConstructKeys.Subtracion, ConstructKeys.Division, ConstructKeys.Multiplication]],
        ["Boolean", [ConstructKeys.And, ConstructKeys.Or, ConstructKeys.Not]],
        ["Comparator", [ConstructKeys.Equals, ConstructKeys.NotEquals, ConstructKeys.GreaterThan, ConstructKeys.GreaterThanOrEqual, ConstructKeys.LessThan, ConstructKeys.LessThanOrEqual]],
        ["Member Function Calls", [ConstructKeys.AppendCall, ConstructKeys.FindCall, ConstructKeys.SplitCall, ConstructKeys.ReplaceCall, ConstructKeys.JoinCall]],
        ["Other", [ConstructKeys.VariableAssignment]]
    ])

    keys = ["Literals", "Function Calls", "Operators", "Control Statements", "Arithmetic", "Boolean", "Comparator", "Member Function Calls", "Other"]

    //have a premade nesting map for all categories and then just populate the various option arrays associated with it in the events file.
    //This is fine since we will have at least one of the top-level event categories displayed in any menu that looks at these.
    //Then if we have only one, we can collapse it into one menu instead of two, but if we have more than 1, we make use of the nesting.

    static globallinkageMap: Map<string, [number, number]>

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

    buildSingleLevelMenu(suggestions: Array<string>, pos: any = {left: 0, top: 0}){
        if(this.menus.length > 0){
            this.removeMenus();
        }

        const suggestionMap = new Map<string, Array<string>>(
            [
                ["Top", suggestions]
            ]
        );
        
        if(suggestions.length > 0){
            this.module.suggestionsController.buildMenuFromOptionMap(suggestionMap, ["Top"], "Top", pos);
        }

        this.openTopLevelMenu();
    }

    buildAvailableInsertsMenu(suggestions: Array<string>, pos: any = {left: 0, top: 0}){
        //TODO: Not all build methods might need this kind of removal logic. It can probably be moved out of the class since this method is now doing two things, removing if necessary and building a new menu. Remember single responsibility.
        if(this.menus.length > 0){
            this.removeMenus();
        }
        else{
            const menuMap =  new Map<string, Array<string>>([
                ["Top", ["Literals", "Function Calls", "Operators", "Control Statements", "Member Function Calls", "Other", ConstructKeys.StringLiteral]],
                ["Literals", [ConstructKeys.StringLiteral, ConstructKeys.NumberLiteral, ConstructKeys.True, ConstructKeys.False, ConstructKeys.ListLiteral]],
                ["Function Calls", [ConstructKeys.PrintCall, ConstructKeys.LenCall, ConstructKeys.RandintCall, ConstructKeys.RangeCall]],
                ["Operators", [ "Comparator"]],
                ["Control Statements", [ConstructKeys.If, ConstructKeys.Elif, ConstructKeys.Else, ConstructKeys.While, ConstructKeys.For]],
                //["Arithmetic", [ConstructKeys.Addition, ConstructKeys.Subtracion, ConstructKeys.Division, ConstructKeys.Multiplication]],
               // ["Boolean", [ConstructKeys.And, ConstructKeys.Or, ConstructKeys.Not]],
                ["Comparator", [ConstructKeys.Equals, ConstructKeys.NotEquals, ConstructKeys.GreaterThan, ConstructKeys.GreaterThanOrEqual, ConstructKeys.LessThan, ConstructKeys.LessThanOrEqual]],
                ["Member Function Calls", [ConstructKeys.AppendCall, ConstructKeys.FindCall, ConstructKeys.SplitCall, ConstructKeys.ReplaceCall, ConstructKeys.JoinCall]],
                ["Other", [ConstructKeys.VariableAssignment]]
            ]);
    
            let keys = ["Literals", "Function Calls", "Operators", "Control Statements",
                           "Comparator", "Member Function Calls", "Other", "Top"
                         ];

            //find all options that link to another menu
            const links = []
            keys.forEach((key) => {
                menuMap.get(key).forEach((option) => { 
                    if(menuMap.has(option)){
                        links.push(option);
                    }
                })
            })
            
            keys.forEach((key) => {
                //remove invalid options that are not links
                if(key != "Top"){
                    menuMap.set(key, menuMap.get(key).filter(option => suggestions.indexOf(option) > -1 || links.indexOf(option) != -1));
                }

                //remove menus with empty options
                if(menuMap.get(key).length == 0){
                    menuMap.delete(key);
                    keys = keys.filter(keyToKeep => keyToKeep != key);
                    
                    //remove link options that link to empty menus from the top level
                    if(menuMap.get("Top").indexOf(key) > -1){
                        menuMap.set("Top", menuMap.get("Top").filter(topKey => topKey != key));
                    }
                }
            });

            this.buildMenuFromOptionMap(menuMap, keys, "Top", pos);
    
            //Menu.collapseSingleOptionLinkMenus(this.menus[this.indexOfTopMenu]);
        }
    }

    //option map should always contain a key that maps to an array of options for the top-level menu
    //without this key, the menu will have an incorrect structure
    buildMenuFromOptionMap(map: Map<string, Array<string>>, keys: Array<string>, topKey: string, pos: any = {left: 0, top: 0}){
        if(this.menus.length > 0){
            this.removeMenus();
        }
        else{
            //build menus with updated structure
            const menus = new Map<string, Menu>();
            keys.forEach((key) => {
                menus.set(key, this.buildMenu(map.get(key), pos));

                if(key == topKey){
                    this.indexOfTopMenu = this.menus.length - 1;
                    this.focusedMenuIndex = this.indexOfTopMenu;
                }
            })

            keys.forEach((key) => {
                map.get(key).forEach((option) => { //if some menu's option is also a key within the map, that means it links two menus together
                    if(map.has(option)){
                        Menu.linkMenuThroughOption(menus.get(key), menus.get(option), option);
                    }
                })
            })

            //indents menu as necessary per structure
            Menu.adjustOffsetWidth(menus.get(topKey), menus.get(topKey).htmlElement.offsetLeft);

            this.openTopLevelMenu();
        }
    }

    //Each set of options is a separate menu. A nesting map is a manual way to link the menus. An entry within the map specifies an option and the two menus
    //it links inthe order [parentIndex, childIndex] where each index refers to the order of these menus in the options array

    //NOTE: Top level menu is always assumed to be at index 0
    buildMenuFromlinkageMap(options: Array<ConstructKeys | string>[], linkageMap: Map<string, number[]>, pos: any = {left: 0, top: 0}){
        if(this.menus.length > 0){
           this.removeMenus();
        }
        else if(options.length > 0){
            const menus = []
            options.forEach(menuOptions => {
                this.buildMenu(menuOptions, pos);
            })
    
            //create menu tree
            options.forEach(menuOptions => {
                menuOptions.forEach(option => {
                    if(linkageMap.has(option)){
                        Menu.linkMenuThroughOption(menus[linkageMap.get(option)[0]], menus[linkageMap.get(option)[1]], option);
                    }
                })
            })
    
            this.menus = menus;
            this.indexOfTopMenu = 0;
            this.focusedMenuIndex = 0;

            this.openTopLevelMenu();
        }
    }

    //helper for building a menu with the given options. Does not do anything in terms of setting the tree structure.
    //The two methods above are the ones that take care of the tree.
    private buildMenu(options: Array<ConstructKeys | string>, pos: any = {left: 0, top: 0}){
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

            this.menus.push(menu);

            return menu;
        }

        return null
    }

    openTopLevelMenu(){
        console.log(this.menus[this.indexOfTopMenu].isOpen())
        if(this.menus.length && this.indexOfTopMenu >= 0){
            if(!this.menus[this.indexOfTopMenu].isOpen()){
                this.menus[this.indexOfTopMenu].open();
            }
            else{
                this.menus[this.indexOfTopMenu].close();
            }
        }
    }

    removeMenus(){
        this.menus.forEach(menu => {
            menu.close();
            menu.removeFromDOM();
        })

        this.menus = [];
    }

    selectOptionBelow(){
        const options = this.menus[this.focusedMenuIndex].htmlElement.getElementsByClassName(SuggestionsController2.optionElementClass);

        if(this.focusedOptionInedx != -1 && this.focusedOptionInedx != options.length){
            options[this.focusedOptionInedx].classList.remove(SuggestionsController2.selectedOptionElementClass);
        }

        this.focusedOptionInedx++;

        if(this.focusedOptionInedx == options.length){
            this.focusedOptionInedx = 0;
        }
        
        options[this.focusedOptionInedx].classList.add(SuggestionsController2.selectedOptionElementClass);

        if(this.focusedOptionInedx == 0){
            this.menus[this.focusedMenuIndex].htmlElement.scrollTop = 0;
        }
        else{
            this.menus[this.focusedMenuIndex].htmlElement.scrollTop += (options[0] as HTMLDivElement).offsetHeight;
        }
    }

    selectOptionAbove(){
        const options = this.menus[this.focusedMenuIndex].htmlElement.getElementsByClassName(SuggestionsController2.optionElementClass);

        if(this.focusedOptionInedx != -1 && this.focusedOptionInedx != options.length){
            options[this.focusedOptionInedx].classList.remove(SuggestionsController2.selectedOptionElementClass);
        }

        this.focusedOptionInedx--;

        if(this.focusedOptionInedx < 0){
            this.focusedOptionInedx = options.length - 1;
        }
        
        options[this.focusedOptionInedx].classList.add(SuggestionsController2.selectedOptionElementClass);

        if(this.focusedOptionInedx == options.length - 1){
            this.menus[this.focusedMenuIndex].htmlElement.scrollTop = (options[0] as HTMLDivElement).offsetHeight * options.length;
        }
        else{
            this.menus[this.focusedMenuIndex].htmlElement.scrollTop -= (options[0] as HTMLDivElement).offsetHeight;
        }
    }

    isMenuOpen(){
        return this.menus.length > 0 ? this.menus[this.indexOfTopMenu].isOpen() : false;
    }
}