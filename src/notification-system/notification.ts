import * as monaco from 'monaco-editor';
import Editor from '../editor/editor';
import {Range} from "monaco-editor";


export class Notification {
    hoverProvider: monaco.IDisposable;
    highlightDecoration: string[];
    message: string;
    editor: Editor;
    notificationRange: Range;
    index: number;


    constructor(editor: Editor, range: Range, index: number = -1, styleClass: string = "", message: string = ""){
        this.editor = editor;
        this.notificationRange = range;
        this.message = message;
        this.index = index;

        this.highlightDecoration = this.highlightRange(styleClass); 
        this.hoverProvider = this.addHover(range, message);
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
    highlightRange(styleClass: string){
        return this.editor.monaco.deltaDecorations([], [
                                                {
                                                    range: this.notificationRange,
                                                    options: {
                                                        isWholeLine: false,
                                                        inlineClassName: styleClass}
                                                }
                                                ]
                                            );
    }

    addHover(notificationRange: Range, errorMsg: string){
        return monaco.languages.registerHoverProvider('python', {
            provideHover: function(model, position){
                if(notificationRange.containsPosition(position)){
                    return {
                        range: notificationRange,
                        contents: [
                            { value: '**SOURCE**' },
                            { value: '```html\n' + errorMsg + '\n```' }
                        ]}
                }
                return null;
            }
        })
    }

    dispose(){
        this.hoverProvider.dispose();
        this.editor.monaco.deltaDecorations(this.highlightDecoration, [{ range: new monaco.Range(1,1,1,1), options : { } }]
      );
    }
}