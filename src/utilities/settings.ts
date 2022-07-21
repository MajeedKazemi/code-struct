import { settingsConfigCategories } from "../editor/consts";
import { Module } from "../syntax-tree/module";

// Singleton controlling settings for the program
export class SettingsController {
    private static instance: SettingsController;

    private modal: HTMLDivElement;
    private settingsContainer: HTMLDivElement;
    private settingsHeader: HTMLDivElement;
    private settingsFooter: HTMLDivElement;
    private exitBtn: HTMLDivElement;

    public config: any;

    module: Module;

    constructor() {
        this.config = {
            [settingsConfigCategories.enabledColoredBlocks]: false,
            [settingsConfigCategories.enabledSpotlightSearch]: false,
            [settingsConfigCategories.enabledTyping]: false,
        };

        this.addEventListeners();
    }

    static getInstance() {
        if (!SettingsController.instance) SettingsController.instance = new SettingsController();

        return SettingsController.instance;
    }

    setInstance(module: Module) {
        this.module = module;
    }

    private addEventListeners() {
        const settingsBtn = document.getElementById("settingsBtn");

        settingsBtn.addEventListener("click", () => {
            this.renderSettings();
        });
    }

    private renderSettings() {
        this.modal = document.createElement("div");
        this.modal.classList.add("settingsModal");
        this.modal.id = "settingsModal";
        document.getElementById("editor-container").appendChild(this.modal);

        this.settingsContainer = document.createElement("div");
        this.settingsContainer.classList.add("settingsContainer");
        this.settingsContainer.id = "settingsContainer";
        document.getElementById("settingsModal").appendChild(this.settingsContainer);

        this.settingsHeader = document.createElement("div");
        this.settingsHeader.classList.add("settingsHeader");
        this.settingsHeader.id = "settingsHeader";
        this.settingsHeader.innerHTML = "Settings";
        this.settingsContainer.appendChild(this.settingsHeader);

        Object.keys(this.config).map((key) => {
            const setting = document.createElement("div");
            setting.classList.add("setting");
            this.settingsContainer.appendChild(setting);

            const settingText = document.createElement("div");
            settingText.classList.add("settingText");
            settingText.innerHTML = key;
            setting.appendChild(settingText);

            const toggleBtn = document.createElement("label");
            toggleBtn.classList.add("toggleBtn");
            setting.appendChild(toggleBtn);

            const toggleBtnCheckbox = document.createElement("input");
            toggleBtnCheckbox.type = "checkbox";
            toggleBtnCheckbox.checked = this.config[key];
            toggleBtnCheckbox.id = key;
            toggleBtn.appendChild(toggleBtnCheckbox);

            const toggleBtnSlider = document.createElement("span");
            toggleBtnSlider.classList.add("toggleBtnSlider");
            toggleBtn.appendChild(toggleBtnSlider);

            toggleBtnCheckbox.addEventListener("change", () => {
                this.config[key] = toggleBtnCheckbox.checked;

                //TODO: update the blocks to be colorless
                //re-render the toolbox
                if (toggleBtnCheckbox.id == settingsConfigCategories.enabledColoredBlocks) {
                    this.module.toolboxController.toggleToolboxColors();
                }
            });
        });

        this.settingsFooter = document.createElement("div");
        this.settingsFooter.classList.add("settingsFooter");
        this.settingsFooter.id = "settingsFooter";
        this.settingsContainer.appendChild(this.settingsFooter);

        this.exitBtn = document.createElement("div");
        this.exitBtn.classList.add("exitBtn");
        this.exitBtn.id = "exitBtn";
        this.exitBtn.innerHTML = "Close";
        this.settingsFooter.appendChild(this.exitBtn);

        this.exitBtn.addEventListener("click", () => {
            this.closeSettings();
        });

        window.onclick = (e: MouseEvent) => {
            if (e.target === this.modal) {
                this.closeSettings();
            }
        };
    }

    private closeSettings() {
        this.modal.remove();
    }
}
