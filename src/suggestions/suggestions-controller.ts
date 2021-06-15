import Editor from "../editor/editor";
import { Module } from "../syntax-tree/ast";
import {ConstructKeys, Util} from "../utilities/util"
import { ConstructDoc } from "./construct-doc";


/*
*A tree menu that can hold options for the user and link through those options to other menus.
*/
export class Menu{
    //Menu object
    private isMenuOpen: boolean = false;
    options: MenuOption[] = [];

    /**
     * Index into this.options of an option that is currently focused and links to another menu.
     */
    openedLinkOptionIndex = -1;


    //tree structure
    children: Menu[] = []
    parentMenu = null;


    //DOM
    static menuCount = 0;
    static idPrefix = "suggestion-menu-";
    htmlElement: HTMLDivElement;

    constructor(options: Map<string, Function>, keys: string[]){
        this.htmlElement = document.createElement("div");
        this.htmlElement.classList.add(MenuController.menuElementClass);
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

    //close any open sub-menus of menu 
    closeChildren(){
        const activeChildren = this.children.filter(menu => menu.isOpen)

        if(activeChildren.length > 0){
            activeChildren.forEach(menu => {
                menu.closeChildren();
                menu.close();
            })
        }
    }

    //indent children of this menu according to their level
    indentChildren(offset: number = 0){
        if(this.children.length > 0){
            let adjustment = offset + this.htmlElement.offsetWidth;
            this.children.forEach(child => {
                child.htmlElement.style.left = `${adjustment}px`;

                if(child.children.length > 0){
                    child.indentChildren(adjustment);
                }
            })
        }
    }
    
    //Link this menu to a child through optionInParent
    linkMenuThroughOption(child: Menu, optionInParent: string){
        const option = this.options.filter(option => option.text === optionInParent)[0]
        option.linkToChildMenu(child);
        option.selectAction = null;
        child.close();

        child.htmlElement.style.left = `${this.htmlElement.offsetWidth + this.htmlElement.offsetLeft}px`

        this.addChildMenu(child);
    }

    //sets all menus that have a single option that links to another set of options
    //to instead contain the set being linked to without the link option
    //In other words, collapse unnecessary menus starting at menu
    collapseSingleOptionLinkMenus(){
        if(this.children.length > 0){
            for(let i = 0; i < this.children.length; i++){
                this.children[i].collapseSingleOptionLinkMenus();

                if(this.children[i].options.length == 1 && this.children[i].options[0].getChildMenu() && this.parentMenu != null){
                    const grandparent = this.children[i].parentMenu;
                    const linkOption = grandparent.options.filter(option => option.child === this.children[i])[0]

                    this.children[i] = this.children[i].options[0].getChildMenu();
                    this.children[i].parentMenu = grandparent;
                    linkOption.child = this.children[i];
                }
            }
            if(this.options.length == 1 && this.options[0].getChildMenu() && this.parentMenu != null){
                this.parentMenu.collapseSingleOptionLinkMenus();
                return
            }
        }

        return
    }

    open(){
        this.isMenuOpen = true;
        this.htmlElement.style.visibility = "visible";
    }

    close(){
        this.isMenuOpen = false;
        this.htmlElement.style.visibility = "hidden";

        //if we are closing this menu, the focused option needs to be reset
        this.options.forEach(option => {
            option.removeFocus();
        })
    }

    isOpen(){
        return this.isMenuOpen;
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

    removeFromDOM(){
        document.getElementById("editor").removeChild(this.htmlElement);
    }
}

export class MenuOption{
    //menu that this option links to
    private childMenu: Menu;

    //menu within which this option is contained
    parentMenu: Menu;

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
        this.htmlElement.classList.add(MenuController.optionElementClass);
        
        const textNode = document.createElement("span");
        textNode.classList.add(MenuController.optionTextElementClass);
        textNode.textContent = text;
        this.htmlElement.appendChild(textNode);

        this.htmlElement.addEventListener("mouseenter", (() => {
            MenuController.getInstance().focusOption(this);
        }).bind(this))

        this.htmlElement.addEventListener("click", () => {
            this.select();
            MenuController.getInstance().removeMenus();
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

    setFocus(){
        this.htmlElement.classList.add(MenuController.selectedOptionElementClass);

        if(this.childMenu){
            this.childMenu.open();
            this.childMenu.htmlElement.style.top = `${this.htmlElement.offsetTop + this.parentMenu.htmlElement.offsetTop - this.parentMenu.htmlElement.scrollTop}px`;
        }

        else if(this.doc){
            this.doc.resetScroll();
            this.doc.show();
        }
    }

    removeFocus(){
        this.htmlElement.classList.remove(MenuController.selectedOptionElementClass);

        if(this.childMenu){
            this.parentMenu.closeChildren();
        }
        else if(this.doc){
            this.doc.hide();
        }
    }
}


export class MenuController{
    private static instance: MenuController

    static optionElementClass: string = "suggestionOptionParent";
    static menuElementClass: string = "suggestionMenuParent";
    static optionTextElementClass: string = "suggestionOptionText";
    static selectedOptionElementClass: string = "selectedSuggestionOptionParent";

    module: Module;
    editor: Editor;
    indexOfTopMenu: number = -1;

    focusedMenuIndex: number = 0;
    focusedOptionIndex: number = -1;

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
        if(!MenuController.instance){
            MenuController.instance = new MenuController();
        }

        return MenuController.instance;
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
            this.module.menuController.buildMenuFromOptionMap(suggestionMap, ["Top"], "Top", pos);
        }

    }

    buildAvailableInsertsMenu(suggestions: Array<string>, pos: any = {left: 0, top: 0}){
        //TODO: Not all build methods might need this kind of removal logic. It can probably be moved out of the class since this method is now doing two things, removing if necessary and building a new menu. Remember single responsibility.
        if(this.menus.length > 0){
            this.removeMenus();
        }
        else{
            const menuMap =  new Map<string, Array<string>>([
                ["Top", ["Literals", "Function Calls", "Operators", "Control Statements", "Member Function Calls", "Other"]],
                ["Literals", [ConstructKeys.StringLiteral, ConstructKeys.NumberLiteral, ConstructKeys.True, ConstructKeys.False, ConstructKeys.ListLiteral]],
                ["Function Calls", [ConstructKeys.PrintCall, ConstructKeys.LenCall, ConstructKeys.RandintCall, ConstructKeys.RangeCall]],
                ["Operators", [ "Comparator"]],
                ["Control Statements", [ConstructKeys.If, ConstructKeys.Elif, ConstructKeys.Else, ConstructKeys.While, ConstructKeys.For]],
                ["Arithmetic", [ConstructKeys.Addition, ConstructKeys.Subtracion, ConstructKeys.Division, ConstructKeys.Multiplication]],
                ["Boolean", [ConstructKeys.And, ConstructKeys.Or, ConstructKeys.Not]],
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
                        menus.get(key).linkMenuThroughOption(menus.get(option), option);
                    }
                })
            })

            //indents menu as necessary per structure
            menus.get(topKey).indentChildren(menus.get(topKey).htmlElement.offsetLeft);

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
                        menus[linkageMap.get(option)[0]].linkMenuThroughOption(menus[linkageMap.get(option)[1]], option);
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

    focusOptionBelow(){
        const options = this.menus[this.focusedMenuIndex].options;
        const optionDomElements = this.menus[this.focusedMenuIndex].htmlElement.getElementsByClassName(MenuController.optionElementClass);

        if(this.focusedOptionIndex != -1 && this.focusedOptionIndex != optionDomElements.length){
            options[this.focusedOptionIndex].removeFocus();
        }

        this.focusedOptionIndex++;

        if(this.focusedOptionIndex == optionDomElements.length){
            this.focusedOptionIndex = 0;
        }
        
        options[this.focusedOptionIndex].setFocus();

        if(this.focusedOptionIndex == 0){
            this.menus[this.focusedMenuIndex].htmlElement.scrollTop = 0;
        }
        else{
            this.menus[this.focusedMenuIndex].htmlElement.scrollTop += (optionDomElements[0] as HTMLDivElement).offsetHeight;
        }
    }

    focusOptionAbove(){
        const options = this.menus[this.focusedMenuIndex].options;
        const optionDomElements = this.menus[this.focusedMenuIndex].htmlElement.getElementsByClassName(MenuController.optionElementClass);

        if(this.focusedOptionIndex != -1 && this.focusedOptionIndex != options.length){
            options[this.focusedOptionIndex].removeFocus();
        }

        this.focusedOptionIndex--;

        if(this.focusedOptionIndex < 0){
            this.focusedOptionIndex = options.length - 1;
        }
        
        options[this.focusedOptionIndex].setFocus();

        if(this.focusedOptionIndex == options.length - 1){
            this.menus[this.focusedMenuIndex].htmlElement.scrollTop = (optionDomElements[0] as HTMLDivElement).offsetHeight * options.length;
        }
        else{
            this.menus[this.focusedMenuIndex].htmlElement.scrollTop -= (optionDomElements[0] as HTMLDivElement).offsetHeight;
        }
    }

    //used for mouse interactions, keys use focusOptionBelow(), focusOptionAbove(), openSubMenu() and closeSubMenu()
    focusOption(option: MenuOption){
        //remove focus from any other options that may be focused within the currently focused menu
        if(this.focusedOptionIndex > -1 && this.focusedMenuIndex == this.menus.indexOf(option.parentMenu)){
            this.menus[this.focusedMenuIndex].options[this.focusedOptionIndex].removeFocus();
        }
    
        //update focus
        this.focusedMenuIndex = this.menus.indexOf(option.parentMenu);
        this.focusedOptionIndex = this.menus[this.focusedMenuIndex].options.indexOf(option);

        //if user navigated from child, need to clear options in newly focused menu as well
        this.menus[this.focusedMenuIndex].options.forEach(option => {
            option.removeFocus();
        })

        this.menus[this.focusedMenuIndex].options[this.focusedOptionIndex].setFocus();
    }

    openSubMenu(){
        if(this.focusedOptionIndex > -1){
            const newFocusedMenu = this.menus[this.focusedMenuIndex].options[this.focusedOptionIndex].getChildMenu();
            const optionDomElements = this.menus[this.focusedMenuIndex].htmlElement.getElementsByClassName(MenuController.optionElementClass);
    
            this.menus[this.focusedMenuIndex].openedLinkOptionIndex = this.focusedOptionIndex;

            if(newFocusedMenu){
                this.selectFocusedOption();
    
                this.focusedMenuIndex = this.menus.indexOf(newFocusedMenu);
                this.focusedOptionIndex = 0;
                this.focusOption(this.menus[this.focusedMenuIndex].options[this.focusedOptionIndex]);
            }
        }
    }

    closeSubMenu(){
        if(this.menus[this.focusedMenuIndex].parentMenu){
            this.menus[this.focusedMenuIndex].options[this.focusedOptionIndex].removeFocus();
            this.focusedMenuIndex = this.menus.indexOf(this.menus[this.focusedMenuIndex].parentMenu);
            this.focusedOptionIndex = this.menus[this.focusedMenuIndex].openedLinkOptionIndex;
            this.menus[this.focusedMenuIndex].options[this.focusedOptionIndex].setFocus();

            this.menus[this.focusedMenuIndex].closeChildren();
        }
    }

    selectFocusedOption(){
        this.menus[this.focusedMenuIndex].options[this.focusedOptionIndex].select();
    }

    isMenuOpen(){
        return this.menus.length > 0 ? this.menus[this.indexOfTopMenu].isOpen() : false;
    }
}