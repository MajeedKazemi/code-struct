const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const webpack = require("webpack");
const isDevelopment = process.env.NODE_ENV !== "production";

module.exports = {
    entry: {
        app: [path.resolve(__dirname, "src/index.tsx"), path.resolve(__dirname, "src/css/index.css")],
        vendor: ["styled-components"],
        "editor.worker": "monaco-editor/esm/vs/editor/editor.worker.js",
        "json.worker": "monaco-editor/esm/vs/language/json/json.worker",
        "css.worker": "monaco-editor/esm/vs/language/css/css.worker",
        "html.worker": "monaco-editor/esm/vs/language/html/html.worker",
        "ts.worker": "monaco-editor/esm/vs/language/typescript/ts.worker",
        shared: ["lodash", "react", "react-dom", "styled-components"],
    },
    mode: "development",
    devtool: "inline-source-map",
    output: {
        filename: "[name].bundle.js",
        path: path.resolve(__dirname, "dist"),
        clean: true,
        globalObject: "self",
    },
    resolve: {
        extensions: ["*", ".tsx", ".ts", ".js", ".jsx"],
        alias: {
            react: path.resolve("node_modules/react"),
            ReactDOM: path.resolve("node_modules/react-dom"),
        },
    },
    module: {
        rules: [
            {
                test: /\.css$/i,
                use: ["style-loader", "css-loader"],
            },
            {
                test: /\.(png|svg|jpg|jpeg|gif|ico)$/i,
                type: "asset/resource",
            },
            {
                test: /\.(woff|woff2|eot|ttf|otf)$/i,
                type: "asset/resource",
            },
            {
                test: /\.(js|jsx|tsx|ts)$/,
                use: [
                    {
                        loader: require.resolve("babel-loader"),
                        options: {
                            presets: ["@babel/preset-env", "@babel/preset-typescript", "@babel/preset-react"],
                            plugins: [
                                isDevelopment &&
                                    require.resolve("react-refresh/babel") &&
                                    require.resolve("@babel/plugin-proposal-class-properties"),
                            ].filter(Boolean),
                        },
                    },
                ],
                exclude: /node_modules/,
            },
        ],
    },
    optimization: {
        runtimeChunk: "single",
    },
    plugins: [
        new HtmlWebpackPlugin(
            {
                title: "Nova Editor",
                template: path.join(__dirname, "src", "index.html"),
                inject: false,
            },
            new webpack.optimize.SplitChunksPlugin({
                name: "vendor",
                minChunks: Infinity,
            })
        ),
    ].filter(Boolean),
};
