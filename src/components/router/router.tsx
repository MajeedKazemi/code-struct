import * as React from 'react';
import { Route, Switch, BrowserRouter } from 'react-router-dom';
import App from "../app/app";
import './style.css';

class Router extends React.Component<{}, {}>{
  render() {
    return (
      <BrowserRouter>
        <Switch>
          <Route
            exact path={["/"] /* any of these URLs are accepted. */}
            render={() => <App />}
          />
        </Switch>
      </BrowserRouter>
    );
  }
}

export default Router;
