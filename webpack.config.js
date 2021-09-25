const path = require("path");
const HtmlWebPackPlugin = require("html-webpack-plugin");
const Dotenv = require('dotenv-webpack');
require('dotenv').config({ path: './.env' }); 

module.exports = {
    mode: "development",
    entry: {
        app: ["./src/index.ts", "./src/js/load-pyodide.js", "./src/js/pyodide-controller.js"],
        "editor.worker": "monaco-editor/esm/vs/editor/editor.worker.js",
        "json.worker": "monaco-editor/esm/vs/language/json/json.worker",
        "css.worker": "monaco-editor/esm/vs/language/css/css.worker",
        "html.worker": "monaco-editor/esm/vs/language/html/html.worker",
        "ts.worker": "monaco-editor/esm/vs/language/typescript/ts.worker"
    },
    resolve: {
        extensions: [".ts", ".js"],
    },
    output: {
        globalObject: "self",
        filename: "[name].bundle.js",
        path: path.resolve(__dirname, "dist"),
    },
    module: {
        rules: [
            {
                test: /\.ts?$/,
                use: "ts-loader",
                exclude: /node_modules/,
            },
            {
                test: /\.css$/,
                use: ["style-loader", "css-loader"],
            },
            {
                test: /\.ttf$/,
                use: ["file-loader"],
            },
        ],
    },
    plugins: [
        new HtmlWebPackPlugin({
            hash: true,
            template: JSON.parse(process.env.EXECUTE_CODE) ? "./src/index.html" : "./src/index_ne.html",
            filename: "./index.html",
        }),
        new Dotenv()
    ],
    devtool: "inline-source-map"
};
