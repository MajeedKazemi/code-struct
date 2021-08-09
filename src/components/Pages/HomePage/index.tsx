import * as React from 'react';
import { withRouter, RouteComponentProps } from 'react-router-dom';

import './style.css'


class HomePage extends React.Component<RouteComponentProps>{
    render(){
        return(
            <div>Hello World!</div>
        )
    }
}

export default withRouter(HomePage);
