const path = require('path');
const HtmlWebPackPlugin = require('html-webpack-plugin');
const isDevelopment = process.env.NODE_ENV !== 'production';

module.exports = {
	mode: 'development',
	entry: {
		app: './src/index.tsx',
		'editor.worker': 'monaco-editor/esm/vs/editor/editor.worker.js',
		'json.worker': 'monaco-editor/esm/vs/language/json/json.worker',
		'css.worker': 'monaco-editor/esm/vs/language/css/css.worker',
		'html.worker': 'monaco-editor/esm/vs/language/html/html.worker',
		'ts.worker': 'monaco-editor/esm/vs/language/typescript/ts.worker'
	},
	resolve: {
		extensions: ['*', '.js', '.jsx', '.tsx', '.ts']
	},
	output: {
		globalObject: 'self',
		filename: '[name].bundle.js',
		path: path.resolve(__dirname, 'dist')
	},
	module: {
		rules: [
			{
				test: /\.css$/,
				use: [ 'style-loader', 'css-loader' ],
			},
			{
				test: /\.ttf$/,
				use: [ 'file-loader' ],
			},
			{
				test: /\.(js|jsx|tsx|ts)$/,
				use: [
					{
						loader: require.resolve('babel-loader'),
						options: {
							presets: ['@babel/preset-env', '@babel/preset-typescript', '@babel/preset-react'],
							plugins: [isDevelopment && require.resolve('react-refresh/babel') && require.resolve("@babel/plugin-proposal-class-properties")].filter(Boolean),
							exclude: /node_modules/,
						}
					}
				],
				exclude: /node_modules/
			},
		]
	},
	plugins: [
		new HtmlWebPackPlugin({
			hash: true,
			template: './src/index.html',
			filename: './index.html',
		})
	],
	devtool: 'inline-source-map'
};
