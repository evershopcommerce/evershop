const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { createBaseConfig } = require('../createBaseConfig');
const { getRouteBuildPath } = require('../getRouteBuildPath');
const { getRouteBuildSubPath } = require('../getRouteBuildSubPath');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { isBuildRequired } = require('../isBuildRequired');
const WebpackBar = require('webpackbar');
const { CONSTANTS } = require('../../helpers');

module.exports.createConfigClient = function createConfigClient(routes) {
  const config = createBaseConfig(false);
  const plugins = config.plugins;
  const entry = {};
  routes.forEach((route) => {
    if (!isBuildRequired(route)) {
      return;
    }
    const subPath = getRouteBuildSubPath(route);
    entry[subPath] = [
      path.resolve(CONSTANTS.BUILDPATH, subPath, 'client', 'entry.js')
    ];
    plugins.push(new HtmlWebpackPlugin({
      templateContent: ({ htmlWebpackPlugin }) => {
        const isFiles = htmlWebpackPlugin.files.js;
        const cssFiles = htmlWebpackPlugin.files.css;
        return JSON.stringify({
          js: isFiles,
          css: cssFiles
        });
      },
      filename: path.resolve(getRouteBuildPath(route), 'client', 'index.json'),
      chunks: [subPath],
      chunksSortMode: 'manual',
      inject: false,
      publicPath: '/assets/'
    }));
  });

  const loaders = config.module.rules;
  loaders.push({
    test: /\.scss$/i,
    use: [
      MiniCssExtractPlugin.loader,
      {
        loader: "css-loader",
        options: {
          url: false,
        }
      },
      "sass-loader"
    ],
  });

  plugins.push(new WebpackBar({ name: 'Client' }),)
  plugins.push(new MiniCssExtractPlugin({
    filename: '[name]/client/[fullhash].css'
  }));
  // plugins.push(new HtmlWebpackPlugin({
  //   filename: 'index.json',
  //   templateContent: ({ htmlWebpackPlugin }) => {
  //     const isFiles = htmlWebpackPlugin.files.js;
  //     const cssFiles = htmlWebpackPlugin.files.css;
  //     return JSON.stringify({
  //       js: isFiles,
  //       css: cssFiles
  //     });
  //   },
  //   inject: false
  // }));

  config.entry = entry;
  config.output.filename = '[name]/client/[fullhash].js';
  config.name = 'Client';

  return config;
}