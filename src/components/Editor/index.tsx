import * as React from 'react';
import { Module } from '../../syntax-tree/module';

type Props = {}
type State = {}



class EditorComponent extends React.Component<Props, State>{
    static EditorParentId = "mainEditorDiv"
  
    render(){
      return (
        <div id = {EditorComponent.EditorParentId}>
        </div>
    );
  }
}

export default EditorComponent;



