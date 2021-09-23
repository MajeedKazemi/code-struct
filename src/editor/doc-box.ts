export class DocumentationBox {
    constructor(uniqueId: string) {
        const container = document.createElement("div");
        container.classList.add("doc-box-container");
        container.id = uniqueId;

        const headerDiv = document.createElement("div");
        headerDiv.classList.add("doc-box-header");

        const closeButton = document.createElement("div");
        closeButton.classList.add("close-button");
        closeButton.innerHTML = `<span>&times;</span>`;

        closeButton.onclick = () => {
            container.remove();
        };

        headerDiv.appendChild(closeButton);
        container.appendChild(headerDiv);

        document.body.appendChild(container);
        makeDraggable(headerDiv);
    }
}

function makeDraggable(element: HTMLDivElement) {
    var pos1 = 0,
        pos2 = 0,
        pos3 = 0,
        pos4 = 0;

    if (document.getElementById(element.id + "header")) {
        // if present, the header is where you move the DIV from:
        document.getElementById(element.id + "header").onmousedown = dragMouseDown;
    } else {
        // otherwise, move the DIV from anywhere inside the DIV:
        element.onmousedown = dragMouseDown;
    }

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();

        // get the mouse cursor position at startup:
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;

        // call a function whenever the cursor moves:
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();

        // calculate the new cursor position:
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;

        if (
            element.parentElement.offsetTop - pos2 > 0 &&
            window.innerHeight - (element.parentElement.offsetTop - pos2 + element.parentElement.clientHeight) > 0
        ) {
            // set the element's new position:
            element.parentElement.style.top = element.parentElement.offsetTop - pos2 + "px";
        }

        if (
            element.parentElement.offsetLeft - pos1 > 0 &&
            window.innerWidth - (element.parentElement.offsetLeft - pos1 + element.parentElement.clientWidth) > 0
        ) {
            element.parentElement.style.left = element.parentElement.offsetLeft - pos1 + "px";
        }
    }

    function closeDragElement() {
        // stop moving when mouse button is released:
        document.onmouseup = null;
        document.onmousemove = null;
    }
}
