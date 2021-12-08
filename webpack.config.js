const path = require("path");
const HtmlWebPackPlugin = require("html-webpack-plugin");
var ExtractTextWebPackPlugin = require('extract-text-webpack-plugin');

module.exports = {
	mode: "development",
	entry: {
		app: ["./src/index.ts", "./src/pyodide-js/load-pyodide.js", "./src/pyodide-js/pyodide-controller.js"],
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
			{
				test: /\.(png|jpg|gif)$/,
				use: [
					{
						loader: 'file-loader',
						options: {
							name: '[path][name].[ext]',
							context: path.resolve(__dirname, "src/"),
							outputPath: 'dist/'
						}
					}
				]
			},
		],
	},
	plugins: [
		new HtmlWebPackPlugin({
			hash: true,
			template: "./src/index.html",
			filename: "./index.html",
		})
	],
	devtool: "inline-source-map"
};
