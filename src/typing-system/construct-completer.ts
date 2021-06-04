import Editor from "../editor/editor";
import { BinaryOperator, BinaryOperatorExpr, CodeConstruct, EmptyExpr, EmptyLineStmt, Expression, LiteralValExpr, TypedEmptyExpr, Statement, Module } from "../syntax-tree/ast";
import * as monaco from 'monaco-editor';


export class ConstructCompleter{

    static instance: ConstructCompleter;
    private editor: Editor;
    private module: Module;

    private constructor(){}

    static getInstance(){
        if(!ConstructCompleter.instance){
            ConstructCompleter.instance = new ConstructCompleter();
        }

        return ConstructCompleter.instance;
    }

    setInstanceContext(module: Module, editor: Editor){
        this.editor = editor;
        this.module = module;
    }


    completeConstruct(){
        //TODO: Currently locate() returns EndOfLine and StartOfLine tokens as well
        //Once that changes, need to modify this to not use the rootNode because presumeably it would be returning a statement or an expression
        const cursorPos = this.editor.monaco.getPosition();
        const closestConstruct = this.module.focusedNode.locate(cursorPos).rootNode as CodeConstruct;
        const parentRoot = closestConstruct.rootNode as CodeConstruct;

        if(!(closestConstruct instanceof Module)){ 
            const selection = closestConstruct.getSelection();

            if(selection.endColumn >= cursorPos.column && closestConstruct instanceof LiteralValExpr){ //for now if the cursor is to the right of a literal val, it is treated as being inside the literal val so keyboard input is treated as inTextEditMode. This makes it only possible to perform + when cursor is to the left of literal
                const newConstruct = new BinaryOperatorExpr(BinaryOperator.Add, closestConstruct.returns, parentRoot, closestConstruct.indexInRoot);
                newConstruct.replaceLeftOperand(new LiteralValExpr(closestConstruct.returns, closestConstruct.getRenderText()));
                

                //TODO: This is duplicate code from Module. Refactor this into a method inside of module!!!
                //TODO: Holes are still messed up
                this.module.replaceFocusedExpression(newConstruct);

                let padding = 1;
                let selection = this.editor.monaco.getSelection();

                if (selection.endColumn == selection.startColumn) padding = 0;

                let range = new monaco.Range(
                    closestConstruct.lineNumber,
                    closestConstruct.left,
                    closestConstruct.lineNumber,
                    closestConstruct.right + padding
                );

                this.editor.executeEdits(range, newConstruct);
                console.log(this.editor.holes)

                /*
                                console.log(this.module.body);

                (closestConstruct.rootNode as Statement).replace(newConstruct, closestConstruct.indexInRoot);
                console.log(newConstruct.getSelection())
                let editRange = new monaco.Range(
                    (parentRoot as CodeConstruct).getSelection().startLineNumber,
                    (parentRoot as CodeConstruct).getSelection().startColumn,
                    (parentRoot as CodeConstruct).getSelection().endLineNumber,
                    (parentRoot as CodeConstruct).getSelection().endColumn,
                );
                this.editor.executeEdits(editRange, parentRoot as CodeConstruct);

                console.log(this.module.body);
                */
            }
        }
        
    }

    completeBinaryOp(): Statement{
        //Check if expressions to the right or left
        //if there is one, then make this expression fill a hole in the binary operator construct type permitting (boolean operators should only accept booleans)
        //if there are none, insert an entire --- + ---
        //make sure this is only in appropriate places. Really this should be done by the validator or the ast.
        //this module is just for determining and outputting the construct the user wanted, other systems can decide whether the insertion is actually valid
      
        
        
        
        /*if(focusedNode.rootNode instanceof LiteralValExpr){
            const construct = new BinaryOperatorExpr(BinaryOperator.Add, focusedNode.rootNode.returns, focusedNode.rootNode.rootNode as CodeConstruct, focusedNode.rootNode.indexInRoot);
            construct.tokens[construct.getLeftOperandIndex()] = focusedNode.rootNode;
            return construct;
        }*/

        return null;

      
      /*  if(focusedNode.rootNode instanceof Expression){
            // "abc"+        --literal should become ("abc" + TypedEmptyExpr)
            // ("a" + "b")+  --expression do we want (() + ()) or (() + hole)
            // 
        }

        //these actually inherit from Token, not Expression
        else if(focusedNode instanceof EmptyExpr){

        }
        else if(focusedNode instanceof TypedEmptyExpr){

        }*/
    }
}