import * as React from 'react';
import Toolbox from "../toolbox/toolbox";
import Editor from "../editor/editor";
import './style.css';

class App extends React.Component<{}, {}>{
  render() {
    return (
      <div id="mainView">
        <Toolbox className={"toolbox"} />
        <Editor className={"editor"} />
      </div>
    );
  }
}

export default App;
