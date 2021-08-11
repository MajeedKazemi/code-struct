import * as React from 'react';
import './style.css';
import * as ReactDOM from 'react-dom';
import {v4 as uuidv4} from 'uuid';

type Props = { children: React.ReactElement[], id: string }
type State = {}

class ToolboxCascadedMenu extends React.Component<Props, State>{


    render() {
        return (
            <div id = {this.props.id} className="cascadedMenuMainDiv">
                {this.props.children.map(child => {
                    return <div key={uuidv4(child)}>{child}</div>
                })}
            </div>
        );
    }
}

export default ToolboxCascadedMenu;
