import * as React from 'react';
import styled from "styled-components";


import Toolbox from "../Toolbox"
import Editor from "../Editor"

import './style.css'



class MainView extends React.Component<{}, {}>{

  StyledToolbox = styled(Toolbox)`
        width: 200px;
        height: 200px;
        background-color: red;
    `

  StyledEditor = styled(Editor)`
    width: 80%;
    height: 100%;

  `

  render(){

    

    return (
      <div id = "mainView">
          <this.StyledToolbox/>
          <this.StyledEditor/>
      </div>
    );
  }
}


export default MainView;



