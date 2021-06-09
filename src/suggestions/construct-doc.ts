
export class ConstructDoc{
    images: Array<string>;
    text: string;
    links: Array<string>[];
    title: string;
    parentElement: HTMLDivElement;

    constructor(title: string = "DOC Title", text: string = "DOC text", images: Array<string> = [], links: Array<string>[] = []){
        this.images = images;
        this.text = text;
        this.title = title;
        this.links = links;

        this.parentElement = document.createElement("div");
        this.parentElement.classList.add("docParent");
        
        this.buildDoc();
        this.hide();
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

        document.getElementById("editor").appendChild(this.parentElement);
    }

    private addImageSection(){
        const imageParent = document.createElement("div");
        imageParent.classList.add("docImageParent");

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

}


