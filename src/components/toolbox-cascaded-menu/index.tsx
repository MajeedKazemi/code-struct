import * as React from 'react';
import './style.css';
import {v4 as uuidv4} from 'uuid';
import { nova } from '../..';

type Props = { children: React.ReactElement[], id: string, buttonId: string }
type State = { hoveringOver: boolean }

class ToolboxCascadedMenu extends React.Component<Props, State>{

    mouseLeaveHandler = () => {
        setTimeout(() => {
            const element = document.getElementById(this.props.id);
            const button = document.getElementById(this.props.buttonId);
            if(element && !element.matches(":hover") && !button.matches(":hover")){
                element.remove();
            }
        }, 50)
    }

    render() {
        return (
            <div id = {this.props.id} className="cascadedMenuMainDiv" onMouseLeave = {this.mouseLeaveHandler}>
                {this.props.children.map(child => {
                    return <div key={uuidv4(child)}>{child}</div>
                })}
            </div>
        );
    }
}

export default ToolboxCascadedMenu;
