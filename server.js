const express = require("express");
const webpack = require("webpack");
const webpackDevMiddleware = require("webpack-dev-middleware");
const webpackHotMiddleware = require("webpack-hot-middleware");
const historyApiFallback = require("connect-history-api-fallback");
const path = require("path");

const app = express();
const config = require("./webpack.config.js");
const compiler = webpack(config);
const instance = webpackDevMiddleware(compiler, {
    publicPath: config.output.publicPath,
});

//.env file load
require("dotenv").config();

// Tell express to use the webpack-dev-middleware and use the webpack.config.js
// configuration file as a base.
//NOTE: Need two use calls to instance, otherwise routes won't work
app.use(instance);
app.use(historyApiFallback());
app.use(instance);

//enable hot middleware
app.use(webpackHotMiddleware(compiler));
app.use(express.static(path.resolve(__dirname, "dist")));

const port = process.env.PORT || 8080;

app.listen(port, function () {
    console.log("Nova-Editor (React) listening on port " + port + "!\n");
});
