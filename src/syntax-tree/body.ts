import { Statement } from "./ast";
import { Module } from "./module";

export function rebuildBody(bodyContainer: Statement | Module, fromIndex: number, startLineNumber: number) {
    let lineNumber = startLineNumber;

    for (let i = fromIndex; i < bodyContainer.body.length; i++) {
        bodyContainer.body[i].indexInRoot = i;

        if (i == 0 && bodyContainer instanceof Statement) {
            bodyContainer.setLineNumber(lineNumber);
            lineNumber++;
        }

        if (bodyContainer.body[i].hasBody()) rebuildBody(bodyContainer.body[i], 0, lineNumber);
        else bodyContainer.body[i].setLineNumber(lineNumber);

        lineNumber += bodyContainer.body[i].getHeight();
    }

    // propagate the rebuild-body process to the root node
    if (bodyContainer instanceof Statement) {
        if (bodyContainer.rootNode instanceof Module) {
            rebuildBody(bodyContainer.rootNode, bodyContainer.indexInRoot + 1, lineNumber);
        } else if (bodyContainer.rootNode instanceof Statement && bodyContainer.rootNode.hasBody()) {
            rebuildBody(bodyContainer.rootNode, bodyContainer.indexInRoot + 1, lineNumber);
        }
    }
}

export function replaceInBody(bodyContainer: Statement | Module, atIndex: number, newStatement: Statement) {
    const leftPos = bodyContainer.body[atIndex].getLeftPosition();
    newStatement.init(leftPos);

    newStatement.rootNode = bodyContainer.body[atIndex].rootNode;
    newStatement.indexInRoot = atIndex;
    bodyContainer.body[atIndex] = newStatement;

    if (newStatement.hasScope()) newStatement.scope.parentScope = bodyContainer.scope;

    rebuildBody(bodyContainer, atIndex + 1, leftPos.lineNumber + newStatement.getHeight());
}
