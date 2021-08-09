import * as React from 'react';
import { Hole } from '../../editor/hole';

import './style.css'


type Props = {className: string}
type State = {}

class Toolbox extends React.Component<Props, State>{
  render(){
    return (
      <div id = "mainToolboxDiv" className = {this.props.className}>
         <div className="group">
                    <p>Function calls</p>
                    <div id="add-print-btn" className="button">print(<hole></hole>)</div>
                    <div id="add-randint-btn" className="button">randint(<hole></hole>, <hole></hole>)</div>
                    <div id="add-range-btn" className="button">range(<hole></hole>, <hole></hole>)</div>
                    <div id="add-len-btn" className="button">len(<hole></hole>)</div>
                </div>

                <div className="group">
                    <p>Control flow</p>
                    <div id="add-while-expr-btn" className="button">while <hole></hole> :</div>
                    <div id="add-if-expr-btn" className="button">if <hole></hole> :</div>
                    <div id="add-elif-expr-btn" className="button">elif <hole></hole> :</div>
                    <div id="add-else-expr-btn" className="button">else:</div>
                    <div id="add-for-expr-btn" className="button">for <hole></hole> in <hole></hole> :</div>
                </div>

                <div className="group">
                    <p>Methods</p>
                    <div id="add-split-method-call-btn" className="button">.split(---)</div>
                    <div id="add-join-method-call-btn" className="button">.join(---)</div>
                    <div id="add-find-method-call-btn" className="button">.find(---)</div>
                    <div id="add-replace-method-call-btn" className="button">.replace(---)</div>
                </div>

                <div className="group" id="variables">
                    <p>Variables</p>
                    <div id="add-var-btn" className="button"><hole></hole> = <span className="hole-toolbox"></span></div>
                </div>

                <div id="user-variables">
                    <h2 id="user-defined-vars-heading">User-Defined Variables</h2>
                    <grid id="vars-button-grid">
                    </grid>
                </div>

                <div className="group">
                    <p>List</p>

                    <div id="add-list-literal-btn" className="button">[]</div>
                    <div id="add-list-item-btn" className="button">
                        , <hole></hole>
                    </div>
                    <div id="add-list-append-stmt-btn" className="button">
                        <span className="hole-toolbox"></span>.append(<hole></hole>)
                    </div>
                    <div id="add-list-index-btn" className="button"><hole></hole>[<hole></hole>]</div>
                    <div id="add-list-elem-assign-btn" className="button">
                        <hole></hole>[<hole></hole>] = <span className="hole-toolbox"></span>
                    </div>
                </div>

                <div className="group">
                    <p>Literals</p>
                    <div id="add-str-btn" className="button">"txt"</div>
                    <div id="add-num-btn" className="button">123</div>
                    <div id="add-true-btn" className="button">True</div>
                    <div id="add-false-btn" className="button">False</div>
                </div>

                <div className="group">
                    <p>Casting</p>
                    <div id="add-cast-str-btn" className="button">str(<hole></hole>)</div>
                </div>

                <div className="group">
                    <p>Operations</p>
                    <div id="add-bin-add-expr-btn" className="button">
                        <hole></hole> + <span className="hole-toolbox"></span>
                    </div>
                    <div id="add-bin-sub-expr-btn" className="button">
                        <hole></hole> - <span className="hole-toolbox"></span>
                    </div>
                    <div id="add-bin-mul-expr-btn" className="button">
                        <hole></hole> * <span className="hole-toolbox"></span>
                    </div>
                    <div id="add-bin-div-expr-btn" className="button">
                        <hole></hole> / <span className="hole-toolbox"></span>
                    </div>
                </div>

                <div className="group">
                    <p>Booleans</p>
                    <div id="add-bin-and-expr-btn" className="button">
                        <hole></hole> and
                        <hole></hole>
                    </div>
                    <div id="add-bin-or-expr-btn" className="button">
                        <hole></hole> or <span className="hole-toolbox"></span>
                    </div>
                    <div id="add-unary-not-expr-btn" className="button">not <hole></hole></div>
                </div>

                <div className="group">
                    <p>Comparisons</p>
                    <div id="add-comp-eq-expr-btn" className="button">
                        <hole></hole> ==
                        <hole></hole>
                    </div>
                    <div id="add-comp-neq-expr-btn" className="button">
                        <hole></hole> !=
                        <hole></hole>
                    </div>
                    <div id="add-comp-lt-expr-btn" className="button">
                        <hole></hole> &lt;
                        <hole></hole>
                    </div>
                    <div id="add-comp-lte-expr-btn" className="button">
                        <hole></hole> &lt;=
                        <hole></hole>
                    </div>
                    <div id="add-comp-gt-expr-btn" className="button">
                        <hole></hole> &gt;
                        <hole></hole>
                    </div>
                    <div id="add-comp-gte-expr-btn" className="button">
                        <hole></hole> &gt;=
                        <hole></hole>
                    </div>
                </div>
            </div>
    );
  }
}


export default Toolbox;



