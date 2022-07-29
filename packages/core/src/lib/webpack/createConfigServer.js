const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlWebpackHarddiskPlugin = require('html-webpack-harddisk-plugin');
const { CONSTANTS } = require('../helpers');
const { createBaseConfig } = require('./createBaseConfig');
const { getRouteBuildPath } = require('./getRouteBuildPath');
const { getRouteBuildSubPath } = require('./getRouteBuildSubPath');


const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
// const reactRefreshRuntimeEntry = require.resolve('react-refresh/runtime');
// const reactRefreshWebpackPluginRuntimeEntry = require.resolve(
//   '@pmmmwh/react-refresh-webpack-plugin'
// );

module.exports.createConfig = function createConfig(isServer, routes) {
  if (routes.lenght === 0) {
    throw new Error("No routes found");
  }
  const entry = {};
  const htmlPlugins = [];
  routes.forEach((route) => {
    const subPath = getRouteBuildSubPath(route);
    const ppp = path.resolve(getRouteBuildPath(route), 'components.js');
    console.log(ppp)
    entry[subPath] = isServer ? [
      path.resolve(getRouteBuildPath(route), 'server', 'components.js'),
      path.resolve(CONSTANTS.LIBPATH, 'components', 'render.js')
    ] :
      [
        path.resolve(getRouteBuildPath(route), 'client', 'components.js'),
        'webpack-hot-middleware/client?name=' + route.id,
      ]

    htmlPlugins.push(new HtmlWebpackPlugin({
      filename: path.resolve(getRouteBuildPath(route), 'index.html'),
      chunks: [subPath, 'vendors'],
      alwaysWriteToDisk: true,
      templateContent: `
      <!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Webpack App</title>
  </head>
  <body>
  <ul>
      <li><a href="/">Home</a></li>
      <li><a href="/cart">Cart</a></li>
  </ul>
  <div id="app"></div>
  </body>
</html>
`
    }));
  });

  const config = createBaseConfig(isServer);
  const plugins = config.plugins;
  if (isServer === false) {
    plugins.push(...htmlPlugins);
    plugins.push(new HtmlWebpackHarddiskPlugin());
    plugins.push(new webpack.HotModuleReplacementPlugin());
    plugins.push(new ReactRefreshWebpackPlugin({
      overlay: false,
    }))
  }
  config.entry = entry;
  if (routes.lenght === 1) {
    config.name = routes[0].id;
  }
  return config;
}