import { constructKeys, Util } from "../utilities/util";

/**
 * Class representing a code construct's documentation that can be displayed to the user.
 */
export class ConstructDoc {
    private docElementClass = "docParent";
    private imgElementClass = "docImageParent";
    private bodyElementClass = "docBody";
    private titleElementClass = "docTitle";

    images: Array<string>;
    text: string;
    links: Array<string>[];
    title: string;
    parentElement: HTMLDivElement;

    static updateDocsLeftOffset(offset: number) {
        constructKeys.forEach((key) => {
            if (Util.getPopulatedInstance().constructDocs.get(key)) {
                Util.getPopulatedInstance().constructDocs.get(key).updateLeftOffset(offset);
            }
        });
    }

    constructor(
        title: string = "DOC Title",
        text: string = "DOC text",
        images: Array<string> = [],
        links: Array<string>[] = []
    ) {
        this.images = images;
        this.text = text;
        this.title = title;
        this.links = links;

        this.parentElement = document.createElement("div");
        this.parentElement.classList.add(this.docElementClass);

        this.buildDoc();
        this.hide();

        this.parentElement.addEventListener("mouseenter", () => {
            this.show();
        });

        this.parentElement.addEventListener("mouseleave", () => {
            this.hide();
        });
    }

    private buildDoc() {
        const title = document.createElement("h3");
        title.textContent = this.title;
        title.classList.add(this.titleElementClass);

        const body = document.createElement("div");
        body.classList.add(this.bodyElementClass);
        body.innerHTML = this.text;

        this.parentElement.appendChild(title);
        this.parentElement.appendChild(body);

        if (this.images.length > 0) this.addImageSection();

        if (this.links.length > 0) this.addLinkSection();

        //TODO: Should be global...
        this.parentElement.style.left = `${document.getElementById("editor").offsetLeft}px`;
        this.parentElement.style.top = `${parseFloat(
            window.getComputedStyle(document.getElementById("editor")).paddingTop
        )}px`;

        document.getElementById("editor").appendChild(this.parentElement);
    }

    private addImageSection() {
        const imageParent = document.createElement("div");
        imageParent.classList.add(this.imgElementClass);

        this.images.forEach((imgSrc) => {
            const image = document.createElement("img");
            image.classList.add("docImage");
            image.src = imgSrc;
            imageParent.appendChild(image);
        });

        this.parentElement.appendChild(imageParent);
    }

    private addLinkSection() {
        const linkParent = document.createElement("div");
        linkParent.classList.add("docLinkParent");

        this.parentElement.appendChild(linkParent);
    }

    show() {
        this.parentElement.style.visibility = "visible";
    }

    hide() {
        this.parentElement.style.visibility = "hidden";
    }

    updateLeftOffset(offset: number) {
        this.parentElement.style.left = `${offset}px`;
    }

    resetScroll() {
        this.parentElement.scrollTop = 0;
    }
}
