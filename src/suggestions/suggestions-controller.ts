import { EditCodeAction } from "../editor/action-filter";
import { Editor } from "../editor/editor";
import { EDITOR_DOM_ID } from "../editor/toolbox";
import { Validator } from "../editor/validator";
import { CodeConstruct, VarAssignmentStmt } from "../syntax-tree/ast";
import { Module } from "../syntax-tree/module";
import { Reference } from "../syntax-tree/scope";
import { ConstructKeys, Util } from "../utilities/util";
import { ConstructDoc } from "./construct-doc";

/*
 *A tree menu that can hold options for the user and link through those options to other menus.
 */
class Menu {
    //Menu object
    private isMenuOpen: boolean = false;
    options: MenuOption[] = [];
    editCodeActionsOptions: EditCodeAction[];

    /**
     * Index into this.options of an option that is currently focused and links to another menu.
     */
    openedLinkOptionIndex = -1;

    //tree structure
    children: Menu[] = [];
    parentMenu = null;

    //DOM
    static menuCount = 0;
    static idPrefix = "suggestion-menu-";
    htmlElement: HTMLDivElement;

    constructor(options: Map<string, Function>) {
        this.htmlElement = document.createElement("div");
        this.htmlElement.classList.add(MenuController.menuElementClass);
        this.htmlElement.id = `${Menu.idPrefix}${Menu.menuCount}`;
        document.getElementById(EDITOR_DOM_ID).appendChild(this.htmlElement);

        Menu.menuCount++;

        for (const [key, value] of options) {
            const option = new MenuOption(key, null, this, null, value);
            option.attachToParentMenu(this);

            this.options.push(option);
        }

        this.htmlElement.addEventListener("mouseover", () => {
            this.htmlElement.style.visibility = "visible";
        });
    }

    //close any open sub-menus of menu
    closeChildren() {
        const activeChildren = this.children.filter((menu) => menu.isOpen);

        if (activeChildren.length > 0) {
            activeChildren.forEach((menu) => {
                menu.closeChildren();
                menu.close();
            });
        }
    }

    //indent children of this menu according to their level
    indentChildren(offset: number = 0) {
        if (this.children.length > 0) {
            const adjustment = offset + this.htmlElement.offsetWidth;
            this.children.forEach((child) => {
                child.htmlElement.style.left = `${adjustment}px`;

                if (child.children.length > 0) child.indentChildren(adjustment);
            });
        }
    }

    //Link this menu to a child through optionInParent
    linkMenuThroughOption(child: Menu, optionInParent: string) {
        const option = this.options.filter((option) => option.text === optionInParent)[0];

        if (option.hasChild()) option.setChildMenu(child);
        else {
            option.linkToChildMenu(child);
            option.selectAction = null;
            child.close();

            child.htmlElement.style.left = `${this.htmlElement.offsetWidth + this.htmlElement.offsetLeft}px`;

            this.addChildMenu(child);
        }
    }

    removeChild(child: Menu) {
        const childIndex = this.children.indexOf(child);

        if (childIndex > -1) {
            this.children.splice(childIndex, 1);
            child.removeFromDOM();
            this.removeLink(child);

            return true;
        }

        return false;
    }

    //Remove the option that links this menu to child from this menu and the DOM
    private removeLink(child: Menu) {
        const link = this.options.filter((option) => option.hasChild() && option.getChildMenu() === child)[0];
        this.options.splice(this.options.indexOf(link), 1);
        link.removeFromDOM();
    }

    //An empty option is one that does not link to another menu and also does not have a select action
    private countEmptyOptions() {
        let count = 0;

        this.options.forEach((option) => {
            if (!option.selectAction && !option.hasChild()) count++;
        });

        return count;
    }

    //Removes menu's that only serve as links (have a single option that links to another menu)
    static collapseSingleLinkMenus(root: Menu) {
        //this will collapse a menu that links to a single option as long as it is not the root menu
        if (root.parentMenu && root.options.length == 1 && root.children.length == 1) {
            const child = root.children[0];

            //move the child's options' DOM elements to root
            child.options.forEach((option) => {
                option.attachToParentMenu(root);
                const removedOption = child.htmlElement.removeChild(option.htmlElement);
                root.htmlElement.appendChild(removedOption);
            });

            //update root's children
            root.setChildMenus([...root.children, ...child.children]);
            root.removeChild(child);
            root.indentChildren(root.htmlElement.offsetLeft);

            root.options = child.options;

            //possible that root is a single option menu that links to another
            root = Menu.collapseSingleLinkMenus(root);

            return root;
        }

        //Do this for all nodes
        root.children.forEach((child) => {
            child = Menu.collapseSingleLinkMenus(child);
        });

        return root;
    }

    removeEmptyChildren() {
        if (this.children.length == 0) {
            //root could be a menu with options that had all of their links removed
            if (this.countEmptyOptions() == this.options.length && this.parentMenu) {
                this.parentMenu.removeChild(this);
            }
        }

        //some options might remain, but not link to a menu or have an action associated with them. These need to be removed
        //this is due to the fact that buildAvailableInsertsMenu() does not recursively check the menuMap for empty options
        let optionsToRemove = [];
        this.options.forEach((option) => {
            if (!option.hasChild() && !option.selectAction) {
                optionsToRemove.push(option);
            }
        });
        optionsToRemove.forEach((option) => {
            option.removeFromDOM();
        });
        optionsToRemove = optionsToRemove.map((option) => option.text);

        this.options = this.options.filter((option) => optionsToRemove.indexOf(option.text) == -1);

        this.children.forEach((child) => {
            child.removeEmptyChildren();
        });
    }

    open() {
        this.isMenuOpen = true;
        this.htmlElement.style.visibility = "visible";
    }

    close() {
        this.isMenuOpen = false;
        this.htmlElement.style.visibility = "hidden";

        //if we are closing this menu, the focused option needs to be reset
        this.options.forEach((option) => {
            option.removeFocus();
        });
    }

    isOpen() {
        return this.isMenuOpen;
    }

    //for bulk setting children
    setChildMenus(menus: Menu[]) {
        menus.forEach(
            ((menu) => {
                menu.parentMenu = this;
            }).bind(this)
        );

        this.children = menus;
    }

    addChildMenu(menu: Menu) {
        menu.parentMenu = this;
        this.children.push(menu);
    }

    removeFromDOM() {
        document.getElementById(EDITOR_DOM_ID).removeChild(this.htmlElement);
    }

    getOptionByText(optionText: string) {
        return this.options.filter((option) => option.text == optionText)[0];
    }
}

/**
 * An option within a menu that can link to another menu or perform an action when selected.
 */
class MenuOption {
    //menu this option links to
    private childMenu: Menu;
    //menu this option is a part of
    parentMenu: Menu;

    text: string;
    doc: ConstructDoc;
    htmlElement: HTMLDivElement;

    //action performed when this option is selected, null if this option links to another menu
    selectAction: Function;

    constructor(
        text: string = "Option Text",
        childMenu?: Menu,
        parentMenu?: Menu,
        doc?: ConstructDoc,
        selectAction?: Function
    ) {
        this.text = text;
        this.childMenu = childMenu;
        this.parentMenu = parentMenu;
        this.doc = doc;
        this.selectAction = selectAction;

        this.htmlElement = document.createElement("div");
        this.htmlElement.classList.add(MenuController.optionElementClass);

        const textNode = document.createElement("span");
        textNode.classList.add(MenuController.optionTextElementClass);
        textNode.textContent = text;
        this.htmlElement.appendChild(textNode);

        this.addArrowImg();

        this.htmlElement.addEventListener(
            "mouseenter",
            (() => {
                MenuController.getInstance().focusOption(this);
            }).bind(this)
        );

        this.htmlElement.addEventListener("click", () => {
            this.select();
            MenuController.getInstance().removeMenus();
        });

        parentMenu.htmlElement.appendChild(this.htmlElement);
    }

    private addArrowImg() {
        if (this.childMenu) {
            const image = document.createElement("img");
            image.src = "./src/res/img/optionArrow.png";
            image.classList.add("optionArrowImage");
            this.htmlElement.appendChild(image);
        }
    }

    select() {
        if (this.childMenu) this.childMenu.open();
        else if (this.selectAction) this.selectAction();
    }

    linkToChildMenu(child: Menu) {
        this.childMenu = child;

        this.htmlElement.addEventListener("mouseenter", () => {
            this.childMenu.parentMenu.openedLinkOptionIndex = this.childMenu.parentMenu.options.indexOf(this);
            this.childMenu.open();
        });

        this.addArrowImg();
    }

    attachToParentMenu(menu: Menu) {
        this.parentMenu = menu;
    }

    hasChild() {
        return this.childMenu ? true : false;
    }

    getChildMenu() {
        return this.childMenu;
    }

    //highlights this option when it is focused on in the menu and opens its child menu if it has one
    setFocus() {
        this.htmlElement.classList.add(MenuController.selectedOptionElementClass);

        if (this.childMenu) {
            this.childMenu.open();
            this.childMenu.htmlElement.style.top = `${
                this.htmlElement.offsetTop +
                this.parentMenu.htmlElement.offsetTop -
                this.parentMenu.htmlElement.scrollTop
            }px`;
        } else if (this.doc) {
            this.doc.resetScroll();
            this.doc.show();
        }
    }

    //removes highlight from option when focused off and closes any child menus that were open
    removeFocus() {
        this.htmlElement.classList.remove(MenuController.selectedOptionElementClass);

        if (this.childMenu) this.parentMenu.closeChildren();
        else if (this.doc) this.doc.hide();
    }

    removeFromDOM() {
        this.parentMenu.htmlElement.removeChild(this.htmlElement);
    }

    setChildMenu(child: Menu) {
        this.childMenu = child;
    }
}

/**
 * Singleton controlling menu generation and removal as well as navigation through a menu
 */
export class MenuController {
    private static instance: MenuController;

    static optionElementClass: string = "suggestionOptionParent";
    static menuElementClass: string = "suggestionMenuParent";
    static optionTextElementClass: string = "suggestionOptionText";
    static selectedOptionElementClass: string = "selectedSuggestionOptionParent";

    module: Module;
    editor: Editor;
    indexOfRootMenu: number = -1;

    focusedMenuIndex: number = 0;
    focusedOptionIndex: number = -1;

    menus: Menu[] = [];

    private constructor() {}

    static getInstance() {
        if (!MenuController.instance) MenuController.instance = new MenuController();

        return MenuController.instance;
    }

    setInstance(module: Module, editor: Editor) {
        this.module = module;
        this.editor = editor;
    }

    //TODO: Remove later
    buildSingleLevelConstructCategoryMenu(suggestions: Array<string | ConstructKeys>) {
        if (this.menus.length > 0) this.removeMenus();
        else {
            const util = Util.getInstance(this.module);
            const actionMap = new Map<string, Function>();

            const menuMap = new Map<string, Array<string>>([
                [
                    "Top",
                    ["Literals", "Function Calls", "Operators", "Control Statements", "Member Function Calls", "Other"],
                ],
                [
                    "Literals",
                    [
                        ConstructKeys.StringLiteral,
                        ConstructKeys.NumberLiteral,
                        ConstructKeys.True,
                        ConstructKeys.False,
                        ConstructKeys.ListLiteral,
                    ],
                ],
                [
                    "Function Calls",
                    [
                        ConstructKeys.PrintCall,
                        ConstructKeys.LenCall,
                        ConstructKeys.RandintCall,
                        ConstructKeys.RangeCall,
                    ],
                ],
                ["Operators", ["Comparator", "Arithmetic", "Boolean"]],
                [
                    "Control Statements",
                    [ConstructKeys.If, ConstructKeys.Elif, ConstructKeys.Else, ConstructKeys.While, ConstructKeys.For],
                ],
                [
                    "Arithmetic",
                    [
                        ConstructKeys.Addition,
                        ConstructKeys.Subtraction,
                        ConstructKeys.Division,
                        ConstructKeys.Multiplication,
                    ],
                ],
                ["Boolean", [ConstructKeys.And, ConstructKeys.Or, ConstructKeys.Not]],
                [
                    "Comparator",
                    [
                        ConstructKeys.Equals,
                        ConstructKeys.NotEquals,
                        ConstructKeys.GreaterThan,
                        ConstructKeys.GreaterThanOrEqual,
                        ConstructKeys.LessThan,
                        ConstructKeys.LessThanOrEqual,
                    ],
                ],
                [
                    "Member Function Calls",
                    [
                        ConstructKeys.AppendCall,
                        ConstructKeys.FindCall,
                        ConstructKeys.SplitCall,
                        ConstructKeys.ReplaceCall,
                        ConstructKeys.JoinCall,
                    ],
                ],
                [
                    "Other",
                    [ConstructKeys.VariableAssignment, ConstructKeys.ListElementAssignment, ConstructKeys.MemberCall],
                ],
            ]);

            const keys = [
                "Literals",
                "Function Calls",
                "Operators",
                "Control Statements",
                "Comparator",
                "Arithmetic",
                "Boolean",
                "Member Function Calls",
                "Other",
                "Top",
            ];
            const categories = [];

            //insert categories as options
            const categorizedSuggestions = [];

            keys.forEach((category) => {
                categorizedSuggestions.push(category);

                actionMap.set(category, () => {
                    console.log(category);
                });

                categories.push(category);

                let emptyCategory = true;

                suggestions.forEach((suggestion) => {
                    if (menuMap.get(category).indexOf(suggestion) > -1) {
                        categorizedSuggestions.push(suggestion);
                        emptyCategory = false;
                    }
                });

                if (emptyCategory) {
                    categorizedSuggestions.splice(categorizedSuggestions.length - 1, 1);
                    categories.splice(categorizedSuggestions.length - 1, 1);
                }
            });

            //add actions
            keys.forEach((category) => {
                menuMap.get(category).forEach((option) => {
                    if (util.constructActions.has(option)) {
                        //construct has an action
                        actionMap.set(option, util.constructActions.get(option));
                    }
                });
            });

            this.buildSingleLevelMenu(categorizedSuggestions, actionMap);

            //update options to have correct style
            this.menus[0].options.forEach((option) => {
                if (categories.indexOf(option.text) > -1) {
                    option.htmlElement.classList.add("categoryHeading");
                } else {
                    option.htmlElement.classList.add("categoryOption");
                }
            });
        }
    }

    /**
     * Build a single-node menu that contains all options provided by suggestions.
     *
     * @param suggestions An array of options this menu will have.
     *
     * @param actionMap   map of option names to their selectActions.
     *                    Provide an empty map if no custom actions are necessary.
     *
     * @param pos         Starting top-left corner of this menu in the editor.
     */
    buildSingleLevelMenu(suggestions: EditCodeAction[], pos: any = { left: 0, top: 0 }) {
        if (this.menus.length > 0) this.removeMenus();
        else if (suggestions.length > 0) {
            const menu = this.module.menuController.buildMenu(suggestions, pos);
            menu.open();
            this.indexOfRootMenu = 0;
            this.focusedOptionIndex = -1;
            menu.editCodeActionsOptions = suggestions;
        }
    }

    /**
     * Build a menu of code construct options available as provided by suggestions.
     *
     * @param suggestions options that should be available in the menu. Strings are treated as menu links if no action is specified for them.
     *
     * @param actionMap   map of option names to their selectActions.
     *                    Provide an empty map if no custom actions are necessary.
     *
     * @param pos         Initial position of the menu's top-left corner.
     */
    buildAvailableInsertsMenu(
        suggestions: Array<string | ConstructKeys>,
        actionMap: Map<string, Function>,
        pos: any = { left: 0, top: 0 }
    ) {
        if (this.menus.length > 0) this.removeMenus();
        else {
            const menuMap = new Map<string, Array<string>>([
                [
                    "Top",
                    ["Literals", "Function Calls", "Operators", "Control Statements", "Member Function Calls", "Other"],
                ],
                [
                    "Literals",
                    [
                        ConstructKeys.StringLiteral,
                        ConstructKeys.NumberLiteral,
                        ConstructKeys.True,
                        ConstructKeys.False,
                        ConstructKeys.ListLiteral,
                    ],
                ],
                [
                    "Function Calls",
                    [
                        ConstructKeys.PrintCall,
                        ConstructKeys.LenCall,
                        ConstructKeys.RandintCall,
                        ConstructKeys.RangeCall,
                    ],
                ],
                ["Operators", ["Comparator", "Arithmetic", "Boolean"]],
                [
                    "Control Statements",
                    [ConstructKeys.If, ConstructKeys.Elif, ConstructKeys.Else, ConstructKeys.While, ConstructKeys.For],
                ],
                [
                    "Arithmetic",
                    [
                        ConstructKeys.Addition,
                        ConstructKeys.Subtraction,
                        ConstructKeys.Division,
                        ConstructKeys.Multiplication,
                    ],
                ],
                ["Boolean", [ConstructKeys.And, ConstructKeys.Or, ConstructKeys.Not]],
                [
                    "Comparator",
                    [
                        ConstructKeys.Equals,
                        ConstructKeys.NotEquals,
                        ConstructKeys.GreaterThan,
                        ConstructKeys.GreaterThanOrEqual,
                        ConstructKeys.LessThan,
                        ConstructKeys.LessThanOrEqual,
                    ],
                ],
                [
                    "Member Function Calls",
                    [
                        ConstructKeys.AppendCall,
                        ConstructKeys.FindCall,
                        ConstructKeys.SplitCall,
                        ConstructKeys.ReplaceCall,
                        ConstructKeys.JoinCall,
                    ],
                ],
                [
                    "Other",
                    [ConstructKeys.VariableAssignment, ConstructKeys.ListElementAssignment, ConstructKeys.MemberCall],
                ],
            ]);

            let keys = [
                "Literals",
                "Function Calls",
                "Operators",
                "Control Statements",
                "Comparator",
                "Arithmetic",
                "Boolean",
                "Member Function Calls",
                "Other",
                "Top",
            ];

            const context = this.module.focus.getContext();

            //add variable references
            const focusedNode = context.token && context.selected ? context.token : context.lineStatement;
            const refs = Validator.getValidVariableReferences(focusedNode, this.module.variableController);
            const identifiers = refs.map((ref) =>
                ((ref[0] as Reference).statement as VarAssignmentStmt).getIdentifier()
            );
            refs.forEach((ref) => {
                if ((ref[0] as Reference).statement instanceof VarAssignmentStmt) {
                    menuMap.get("Other").push(((ref[0] as Reference).statement as VarAssignmentStmt).getIdentifier());
                    actionMap.set(
                        ((ref[0] as Reference).statement as VarAssignmentStmt).getIdentifier(),
                        this.module
                            .getVarRefHandler((ref[0] as Reference).statement as VarAssignmentStmt)
                            .bind(this.module)
                    );
                }
            });

            //find all options that link to another menu
            const links = [];
            keys.forEach((menuKey) => {
                menuMap.get(menuKey).forEach((option) => {
                    if (menuMap.has(option)) links.push(option);
                });
            });

            //menuMap.get(menuKey) is the array of options for that menu
            keys.forEach((menuKey) => {
                //add menu options based on suggestions, options that are not in suggestions will not be included
                if (menuKey != "Top") {
                    menuMap.set(
                        menuKey,
                        menuMap
                            .get(menuKey)
                            .filter(
                                (option) =>
                                    suggestions.indexOf(option) > -1 ||
                                    links.indexOf(option) != -1 ||
                                    identifiers.indexOf(option) > -1
                            )
                    );
                }

                //remove menus with empty options
                //(this is not recursive so it won't catch an option that links to a menu whose options were all removed which exists within another menu)
                if (menuMap.get(menuKey).length == 0) {
                    menuMap.delete(menuKey);
                    keys = keys.filter((keyToKeep) => keyToKeep != menuKey);

                    //remove link options that link to empty menus from the top level
                    if (menuMap.get("Top").indexOf(menuKey) > -1) {
                        menuMap.set(
                            "Top",
                            menuMap.get("Top").filter((rootKey) => rootKey != menuKey)
                        );
                    }
                }
            });

            this.buildMenuFromOptionMap(menuMap, keys, "Top", actionMap, pos);
        }
    }

    /**
     * Builds a menu from a map of links between options and menus.
     *
     * @param map       map of menu names to their option arrays. If an option of a menu is a key, then it serves as a link between those menus. Otherwise keys are just names of each menu.
     * @param keys      map's keys.
     * @param rootKey   key of the root menu in map. Should ALWAYS be included.
     * @param actionMap map of option names to their selectActions.
     *                  Provide an empty map if no custom actions are necessary.
     * @param pos       Initial top-left corner of the menu.
     */
    private buildMenuFromOptionMap(
        map: Map<string, Array<string | ConstructKeys>>,
        keys: Array<string>,
        rootKey: string,
        actionMap: Map<string, Function>,
        pos: any = { left: 0, top: 0 }
    ) {
        if (this.menus.length > 0) {
            this.removeMenus();
        } else {
            //build menus with updated structure
            const menus = new Map<string, Menu>();

            keys.forEach((menuKey) => {
                //menus.set(menuKey, this.buildMenu(map.get(menuKey), pos));

                if (menuKey == rootKey) {
                    this.indexOfRootMenu = this.menus.length - 1;
                    this.focusedMenuIndex = this.indexOfRootMenu;
                }
            });

            //TODO: Redesign of how building a menu works
            /**
             * 1. Need to make these methods accept a map returned from action-filter.ts
             *  1.2. No need to run own validations here anymore. At most need to run the methods from aciton-filter.ts here and use their output
             * 2. linkMenuThroughOption() is what creates the tree structure by assigning child menus to a parent
             * 3. indentChildren() is what creates the tree structure visually when the menu is displayed
             * 4. So all that has to be changed really is how the map argument of this function is generated in buildAvailableInsertsMenu()
             */

            //set actions
            //for every menu
            keys.forEach((menuKey) => {
                //for every option within menu
                map.get(menuKey).forEach((option) => {
                    if (actionMap.has(option)) {
                        menus.get(menuKey).getOptionByText(option).selectAction = actionMap.get(option);
                    } else if (map.has(option)) {
                        //if some menu's option is also a key within the map, that means it links two menus together
                        menus.get(menuKey).linkMenuThroughOption(menus.get(option), option);
                    }
                });
            });

            //indents menu as necessary per structure
            menus.get(rootKey).indentChildren(menus.get(rootKey).htmlElement.offsetLeft);
            menus.set(rootKey, Menu.collapseSingleLinkMenus(menus.get(rootKey)));
            menus.get(rootKey).removeEmptyChildren();

            this.updateMenuArrayFromTree(menus.get(rootKey), true);
            this.openRootMenu();
        }
    }

    /**
     *
     * @param menus      options of every menu to be built. The root menu should ALWAYS be at index 0.
     *
     * @param linkageMap a manual way to link the menus.
     *                   A key within the map maps an option to its parent and child menus in the form of an array [parentIndex, childIndex]
     *                   where each index is into menus
     *
     * @param actionMap  map of option names to their selectActions.
     *                   Provide an empty map if no custom actions are necessary.
     *
     * @param pos        Initial top-left corner of the menu.
     */
    private buildMenuFromLinkageMap(
        menus: Array<ConstructKeys | string>[],
        linkageMap: Map<string, number[]>,
        actionMap: Map<string, Function>,
        pos: any = { left: 0, top: 0 }
    ) {
        if (this.menus.length > 0) this.removeMenus();
        else if (menus.length > 0) {
            const menus = [];

            menus.forEach((menuOptions) => {
                const menu = this.buildMenu(menuOptions, pos);

                //create menu tree
                menuOptions.forEach((option) => {
                    if (actionMap.has(option)) {
                        menu.getOptionByText(option).selectAction = actionMap.get(option);
                    } else if (linkageMap.has(option)) {
                        menus[linkageMap.get(option)[0]].linkMenuThroughOption(
                            menus[linkageMap.get(option)[1]],
                            option
                        );
                    }
                });
            });

            this.menus = menus;
            this.indexOfRootMenu = 0;
            this.focusedMenuIndex = 0;

            menus[0].indentChildren(menus[0].htmlElement.offsetLeft);
            menus[0] = Menu.collapseSingleLinkMenus(menus[0]);
            menus[0].removeEmptyChildren();

            this.updateMenuArrayFromTree(menus[0], true);
            this.openRootMenu();
        }
    }

    /**
     * Helper for building a menu and assigning its options. Does not specify the tree structure. Simply constructs a Menu object.
     *
     * @param options the menu's options.
     * @param pos     Initial top-left corner of the menu.
     *
     * @returns the constructed menu. Null if no options was empty.
     */
    private buildMenu(options: EditCodeAction[], pos: any = { left: 0, top: 0 }) {
        if (options.length > 0) {
            const menuOptions = new Map<string, Function>();

            for (const action of options) {
                menuOptions.set(action.optionName, () => {
                    action.performAction(this.module.executer, this.module.eventRouter, this.module.focus.getContext());
                });
            }

            const menu = new Menu(menuOptions);

            //TODO: These are the same values as the ones used for mouse offset by the Notifications so maybe make them shared in some util file
            menu.htmlElement.style.left = `${pos.left + document.getElementById(EDITOR_DOM_ID).offsetLeft}px`;
            menu.htmlElement.style.top = `${
                pos.top + parseFloat(window.getComputedStyle(document.getElementById(EDITOR_DOM_ID)).paddingTop)
            }px`;

            //TODO: No good way of separating responsibility completely because ready doc objects are stored in util instead of being created here.
            //I guess, it is always possible to have a list of active docs and loop through it here and update their positions instead of
            //using the static method to update them all. Do that in case this ever slows down anything.
            ConstructDoc.updateDocsLeftOffset(
                document.getElementById(EDITOR_DOM_ID).offsetLeft +
                    document.getElementById(`${Menu.idPrefix}${Menu.menuCount - 1}`).offsetWidth
            );

            this.menus.push(menu);

            return menu;
        }

        return null;
    }

    private openRootMenu() {
        if (this.menus.length && this.indexOfRootMenu >= 0) {
            if (!this.menus[this.indexOfRootMenu].isOpen()) {
                this.menus[this.indexOfRootMenu].open();
            } else this.menus[this.indexOfRootMenu].close();
        }
    }

    removeMenus() {
        this.menus.forEach((menu) => {
            menu.close();
            menu.removeFromDOM();
        });

        this.menus = [];
    }

    //Removes focus from currently focused option and sets it to the option below it.
    focusOptionBelow() {
        const options = this.menus[this.focusedMenuIndex].options;
        const optionDomElements = this.menus[this.focusedMenuIndex].htmlElement.getElementsByClassName(
            MenuController.optionElementClass
        );

        if (this.focusedOptionIndex != -1 && this.focusedOptionIndex != optionDomElements.length) {
            options[this.focusedOptionIndex].removeFocus();
        }

        this.focusedOptionIndex++;

        if (this.focusedOptionIndex == optionDomElements.length) {
            this.focusedOptionIndex = 0;
        }

        options[this.focusedOptionIndex].setFocus();
        if (options[this.focusedOptionIndex].hasChild()) {
            this.menus[this.focusedMenuIndex].openedLinkOptionIndex = this.focusedOptionIndex;
        }

        if (this.focusedOptionIndex == 0) {
            this.menus[this.focusedMenuIndex].htmlElement.scrollTop = 0;
        } else {
            this.menus[this.focusedMenuIndex].htmlElement.scrollTop += (
                optionDomElements[0] as HTMLDivElement
            ).offsetHeight;
        }
    }

    //Removes focus from currently focused option and sets it to the option above it.
    focusOptionAbove() {
        const options = this.menus[this.focusedMenuIndex].options;
        const optionDomElements = this.menus[this.focusedMenuIndex].htmlElement.getElementsByClassName(
            MenuController.optionElementClass
        );

        if (this.focusedOptionIndex != -1 && this.focusedOptionIndex != options.length) {
            options[this.focusedOptionIndex].removeFocus();
        }

        this.focusedOptionIndex--;

        if (this.focusedOptionIndex < 0) this.focusedOptionIndex = options.length - 1;

        options[this.focusedOptionIndex].setFocus();
        if (options[this.focusedOptionIndex].hasChild()) {
            this.menus[this.focusedMenuIndex].openedLinkOptionIndex = this.focusedOptionIndex;
        }

        if (this.focusedOptionIndex == options.length - 1) {
            this.menus[this.focusedMenuIndex].htmlElement.scrollTop =
                (optionDomElements[0] as HTMLDivElement).offsetHeight * options.length;
        } else {
            this.menus[this.focusedMenuIndex].htmlElement.scrollTop -= (
                optionDomElements[0] as HTMLDivElement
            ).offsetHeight;
        }
    }

    //Tracks the focused option for mouse interactions. Keys use focusOptionBelow(), focusOptionAbove(), openSubMenu() and closeSubMenu()
    focusOption(option: MenuOption) {
        //remove focus from any other options that may be focused within the currently focused menu
        if (this.focusedOptionIndex > -1 && this.focusedMenuIndex == this.menus.indexOf(option.parentMenu)) {
            this.menus[this.focusedMenuIndex].options[this.focusedOptionIndex].removeFocus();
        }

        //update focus
        this.focusedMenuIndex = this.menus.indexOf(option.parentMenu);
        this.focusedOptionIndex = this.menus[this.focusedMenuIndex].options.indexOf(option);

        //if user navigated from child, need to clear options in newly focused menu as well
        this.menus[this.focusedMenuIndex].options.forEach((option) => {
            option.removeFocus();
        });

        this.menus[this.focusedMenuIndex].options[this.focusedOptionIndex].setFocus();
    }

    //Open the menu, if any, that the currently focused option links to.
    openSubMenu() {
        if (this.focusedOptionIndex > -1) {
            const newFocusedMenu = this.menus[this.focusedMenuIndex].options[this.focusedOptionIndex].getChildMenu();

            this.menus[this.focusedMenuIndex].openedLinkOptionIndex = this.focusedOptionIndex;

            if (newFocusedMenu) {
                this.selectFocusedOption();

                this.focusedMenuIndex = this.menus.indexOf(newFocusedMenu);
                this.focusedOptionIndex = 0;
                this.focusOption(this.menus[this.focusedMenuIndex].options[this.focusedOptionIndex]);
            }
        }
    }

    //Close any open sub-menus when navigating up in the menu from the currently focused option.
    closeSubMenu() {
        if (this.menus[this.focusedMenuIndex].parentMenu) {
            this.menus[this.focusedMenuIndex].options[this.focusedOptionIndex].removeFocus();
            this.focusedMenuIndex = this.menus.indexOf(this.menus[this.focusedMenuIndex].parentMenu);
            this.focusedOptionIndex = this.menus[this.focusedMenuIndex].openedLinkOptionIndex;
            this.menus[this.focusedMenuIndex].options[this.focusedOptionIndex].setFocus();
            this.menus[this.focusedMenuIndex].closeChildren();
        }
    }

    //Perform the action associated with the currently focused option.
    selectFocusedOption() {
        if (this.focusedOptionIndex > -1) {
            this.menus[this.focusedMenuIndex].options[this.focusedOptionIndex].select();
        }
    }

    isMenuOpen() {
        return this.menus.length > 0 ? this.menus[this.indexOfRootMenu].isOpen() : false;
    }

    updateMenuArrayFromTree(root: Menu, isRoot: boolean) {
        if (isRoot) {
            this.indexOfRootMenu = 0;
            this.menus = [];
            this.focusedOptionIndex = -1;
            this.focusedMenuIndex = 0;
        }

        this.menus.push(root);

        root.children.forEach((child) => {
            this.updateMenuArrayFromTree(child, false);
        });
    }

    updateMenuOptions(optionText: string) {
        if (this.isMenuOpen()) {
            const menu = this.menus[this.focusedMenuIndex];
            const searchResult = Validator.matchString(
                optionText,
                menu.editCodeActionsOptions.map((action) => action.optionName)
            );
            const searchResultStrings = searchResult.map((result) => result.item);
            const optionsToKeep = menu.editCodeActionsOptions.filter(
                (action) => searchResultStrings.indexOf(action.optionName) > -1
            );

            let focusedOptionText = "";
            if (this.focusedOptionIndex > -1) {
                focusedOptionText = menu.options[this.focusedOptionIndex].text;
            }

            menu.options.forEach((option) => {
                option.removeFromDOM();
            });

            menu.options = [];

            for (const editAction of optionsToKeep) {
                const option = new MenuOption(editAction.optionName, null, menu, null, () => {
                    editAction.performAction(
                        this.module.executer,
                        this.module.eventRouter,
                        this.module.focus.getContext()
                    );
                });

                this.insertOptionIntoMenu(option, menu);

                if (option.text === focusedOptionText) {
                    this.focusedOptionIndex = menu.options.length - 1;
                    option.htmlElement.classList.add(MenuController.selectedOptionElementClass);
                }
            }

            if (optionsToKeep.length == 0) {
                const option = new MenuOption("No suitable options found.", null, menu, null, () => {});
                this.insertOptionIntoMenu(option, menu);
                this.focusedOptionIndex = -1;
            }
        }
    }

    updatePosition(pos: { left: number; top: number }) {
        this.menus[this.focusedMenuIndex].htmlElement.style.left = `${pos.left}px`;
        this.menus[this.focusedMenuIndex].htmlElement.style.top = `${pos.top}px`;
    }

    getNewMenuPosition(code: CodeConstruct): { left: number; top: number } {
        const pos = { left: 0, top: 0 };
        pos.left =
            document.getElementById(EDITOR_DOM_ID).offsetLeft +
            (
                document
                    .getElementById(EDITOR_DOM_ID)
                    .getElementsByClassName("monaco-editor no-user-select  showUnused showDeprecated vs")[0]
                    .getElementsByClassName("overflow-guard")[0]
                    .getElementsByClassName("margin")[0] as HTMLElement
            ).offsetWidth +
            (this.module.editor.computeCharWidth()
                ? code.getRenderText().length * this.module.editor.computeCharWidth()
                : 0);

        pos.top =
            this.module.editor.monaco.getSelection().startLineNumber * this.module.editor.computeCharHeight() +
            parseFloat(window.getComputedStyle(document.getElementById(EDITOR_DOM_ID)).paddingTop);

        return pos;
    }

    private insertOptionIntoMenu(option: MenuOption, menu: Menu) {
        option.attachToParentMenu(menu);
        menu.options.push(option);
    }
}
