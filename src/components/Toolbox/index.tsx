import * as React from 'react';

type Props = {className: string}
type State = {}

class Toolbox extends React.Component<Props, State>{
  render(){
    return (
      <div id = "mainToolboxDiv" className = {this.props.className}>
      </div>
    );
  }
}


export default Toolbox;


