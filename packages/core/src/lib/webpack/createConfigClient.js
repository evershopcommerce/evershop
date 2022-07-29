const path = require('path');
const webpack = require('webpack');
const { createBaseConfig } = require('./createBaseConfig');
const { getRouteBuildPath } = require('./getRouteBuildPath');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');

module.exports.createConfigClient = function createConfigClient(route) {
  const entry = {};
  entry[route.id] = [
    path.resolve(getRouteBuildPath(route), 'client', 'components.js'),
    'webpack-hot-middleware/client?name=' + route.id,
  ];

  const config = createBaseConfig(false);
  config.name = route.id;

  const plugins = config.plugins;
  plugins.push(new webpack.HotModuleReplacementPlugin());
  plugins.push(new ReactRefreshWebpackPlugin({
    overlay: false,
  }))
  config.entry = entry;

  return config;
}