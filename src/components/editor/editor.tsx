import * as React from 'react';
import './style.css';

type Props = { className }
type State = {}

class EditorComponent extends React.Component<Props, State>{
  static EditorParentId = "mainEditorDiv"

  render() {
    return (
      <div id={EditorComponent.EditorParentId} className={this.props.className}>
      </div>
    );
  }
}

export default EditorComponent;
