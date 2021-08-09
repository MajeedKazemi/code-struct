import * as React from 'react';
import styled from "styled-components";


import Toolbox from "../Toolbox"
import Editor from "../Editor"

import './style.css'



class MainView extends React.Component<{}, {}>{

  render(){
    return (
      <div id = "mainView">
          <Toolbox className = {"toolbox"}/>
          <Editor className = {"editor"}/>
      </div>
    );
  }
}


export default MainView;



