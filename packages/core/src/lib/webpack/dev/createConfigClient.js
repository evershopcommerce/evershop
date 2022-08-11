const path = require('path');
const webpack = require('webpack');
const { createBaseConfig } = require('../createBaseConfig');
const { getRouteBuildPath } = require('../getRouteBuildPath');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');

module.exports.createConfigClient = function createConfigClient(route) {
  const entry = {};
  entry[route.id] = [
    path.resolve(getRouteBuildPath(route), 'client', 'components.js'),
    'webpack-hot-middleware/client?path=' + `/eHot/${route.id}&reload=true&overlay=true`,
  ];

  const config = createBaseConfig(false);
  config.name = route.id;

  const loaders = config.module.rules;
  loaders.push({
    test: /\.scss$/i,
    use: [
      {
        loader: "style-loader",
        options: {},
      },
      {
        loader: "css-loader",
        options: {
          url: false,
        }
      },
      "sass-loader"
    ],
  });

  const plugins = config.plugins;
  plugins.push(new webpack.HotModuleReplacementPlugin());
  plugins.push(new ReactRefreshWebpackPlugin({
    overlay: false,
  }));

  config.entry = entry;
  config.watchOptions = {
    aggregateTimeout: 300,
    poll: 1000,
    ignored: /node_modules/
  };

  return config;
}