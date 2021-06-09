import { constructKeys, Util } from "../utilities/util";

export class ConstructDoc{
    images: Array<string>;
    text: string;
    links: Array<string>[];
    title: string;
    parentElement: HTMLDivElement;

    static updateDocsLeftOffset(offset: number){
        constructKeys.forEach((key) => {
            if(Util.getInstance().constructDocs.get(key)){
                Util.getInstance().constructDocs.get(key).updateLeftOffset(offset);
            }
        })
    }

    constructor(title: string = "DOC Title", text: string = "DOC text", images: Array<string> = [], links: Array<string>[] = []){
        this.images = images;
        this.text = text;
        this.title = title;
        this.links = links;

        this.parentElement = document.createElement("div");
        this.parentElement.classList.add("docParent");
        
        this.buildDoc();
        this.hide();

        this.parentElement.addEventListener("mouseenter", () => {
            this.show();
        });

        this.parentElement.addEventListener("mouseleave", () => {
            this.hide();
        })
    }

    private buildDoc(){
        const title = document.createElement("h3");
        title.textContent = this.title;
        title.classList.add("docTitle");

        const body = document.createElement("div");
        body.classList.add("docBody");
        body.innerHTML = this.text;

        this.parentElement.appendChild(title);
        this.parentElement.appendChild(body);

        if(this.images.length > 0){
            this.addImageSection();
        }

        if(this.links.length > 0){
            this.addLinkSection();
        }

        //TODO: Should be global...
        this.parentElement.style.left = `${document.getElementById("editor").offsetLeft}px`;
        this.parentElement.style.top = `${parseFloat(window.getComputedStyle(document.getElementById("editor")).paddingTop)}px`;

        document.getElementById("editor").appendChild(this.parentElement);
    }

    private addImageSection(){
        const imageParent = document.createElement("div");
        imageParent.classList.add("docImageParent");

        this.images.forEach((imgSrc) => {
            const image = document.createElement("img");
            image.classList.add("docImage");
            image.src = imgSrc;
            imageParent.appendChild(image);
        })
        

        this.parentElement.appendChild(imageParent);
    }

    private addLinkSection(){
        const linkParent = document.createElement("div");
        linkParent.classList.add("docLinkParent");

        this.parentElement.appendChild(linkParent);
    }

    show(){
        this.parentElement.style.visibility = "visible";
    }

    hide(){
        this.parentElement.style.visibility = "hidden";
    }

    updateLeftOffset(offset: number){
        this.parentElement.style.left = `${offset}px`;
    }
}


