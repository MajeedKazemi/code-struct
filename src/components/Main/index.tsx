//dependencies
import * as React from 'react';
import { Route, Switch, BrowserRouter, RouteComponentProps} from 'react-router-dom';

import MainView from "../MainView"

class Main extends React.Component<{}, {}>{
  render(){
    return (
      <BrowserRouter>
          <Switch> 
            <Route
              exact path={["/"] /* any of these URLs are accepted. */ }
              render={() => <MainView/>}
            /> 
          </Switch>
        </BrowserRouter>
    );
  }
}


export default Main;



