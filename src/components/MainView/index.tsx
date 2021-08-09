import * as React from 'react';
import styled from "styled-components";


import Toolbox from "../Toolbox"
import Editor from "../Editor"


class MainView extends React.Component<{}, {}>{

  StyledToolbox = styled(Toolbox)`
        width: 200px;
        height: 200px;
        background-color: red;
    `

  render(){

    

    return (
      <div id = "mainView">
          <this.StyledToolbox/>
          <Editor/>
      </div>
    );
  }
}


export default MainView;



