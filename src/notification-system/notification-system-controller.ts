import { CodeConstruct} from "../syntax-tree/ast";
import { NotificationSystem } from "./notification-system";
import Editor from '../editor/editor';
import {Range} from "monaco-editor";

/**
 * Class representing the main entry point of the code into the NotificationSystem. 
 * Top-level class for handling workflow; notification system logic is in NotificationSystem.
 */
export class NotificationSystemController{
    notificationSystem: NotificationSystem;
	editor: Editor;

    constructor(editor: Editor){
        this.notificationSystem = new NotificationSystem();
        this.editor = editor;
    }

    runValidation(code: CodeConstruct){
        this.highlightRange(code.getLineNumber(), code.left, code.getLineNumber(), code.right, "notificationHighlight");
    }

    /**
     * Highlight rectangular area within the editor.
     * 
     * @param startLineNumber line to begin highlight on
     * @param startPos        left column position of the highlight
     * @param endLineNumber   line to end the highlight on
     * @param rightPos        right column position of the highlight
     * @param styleClass      name of css class containing the style for the highlight
     */
    highlightRange(startLineNumber: number, startPos: number, endLineNumber: number, endPos: number, styleClass: string){
        this.editor.monaco.deltaDecorations([], [
                                                  {
                                                    range: new Range(startLineNumber, startPos, endLineNumber, endPos),
                                                    options: {
                                                        isWholeLine: false,
                                                        inlineClassName: styleClass}
                                                  }
                                                ]
                                            );
    }


}