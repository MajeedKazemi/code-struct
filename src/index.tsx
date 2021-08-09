
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import EditorComponent from './components/Editor';

import Main from './components/Main'

import { Module } from "./syntax-tree/module";

// @ts-ignore
self.MonacoEnvironment = {
    getWorkerUrl: function (moduleId, label) {
        if (label === "json") {
            return "./json.worker.bundle.js";
        }
        if (label === "css" || label === "scss" || label === "less") {
            return "./css.worker.bundle.js";
        }
        if (label === "html" || label === "handlebars" || label === "razor") {
            return "./html.worker.bundle.js";
        }
        if (label === "typescript" || label === "javascript") {
            return "./ts.worker.bundle.js";
        }
        return "./editor.worker.bundle.js";
    },
};

ReactDOM.render(
	<React.StrictMode>
        <Main/>
	</React.StrictMode>,
	document.getElementById('root')
);

export const nova = new Module(EditorComponent.EditorParentId);
