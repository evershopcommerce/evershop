const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const WebpackBar = require('webpackbar');
const { createBaseConfig } = require('../createBaseConfig');
const { getRouteBuildPath } = require('../getRouteBuildPath');
const { getRouteBuildSubPath } = require('../getRouteBuildSubPath');
const { isBuildRequired } = require('../isBuildRequired');
const { CONSTANTS } = require('../../helpers');
const { Tailwindcss } = require('../plugins/Tailwindcss');

module.exports.createConfigClient = function createConfigClient(routes) {
  const config = createBaseConfig(false);
  const { plugins } = config;
  const entry = {};
  routes.forEach((route) => {
    if (!isBuildRequired(route)) {
      return;
    }
    const subPath = getRouteBuildSubPath(route);
    entry[subPath] = [
      path.resolve(CONSTANTS.BUILDPATH, subPath, 'client', 'entry.jsx')
    ];
    plugins.push(
      new HtmlWebpackPlugin({
        templateContent: ({ htmlWebpackPlugin }) => {
          const isFiles = htmlWebpackPlugin.files.js;
          const cssFiles = htmlWebpackPlugin.files.css;
          return JSON.stringify({
            js: isFiles,
            css: cssFiles
          });
        },
        filename: path.resolve(
          getRouteBuildPath(route),
          'client',
          'index.json'
        ),
        chunks: [subPath],
        chunksSortMode: 'manual',
        inject: false,
        publicPath: '/assets/'
      })
    );

    plugins.push(new Tailwindcss(subPath, route));
  });

  const loaders = config.module.rules;
  loaders.push({
    test: /\.(css|scss)$/i,
    use: [
      MiniCssExtractPlugin.loader,
      {
        loader: 'css-loader',
        options: {
          url: false
        }
      },
      {
        loader: path.resolve(
          CONSTANTS.LIBPATH,
          'webpack/loaders/TailwindLoader.js'
        ),
        options: {}
      },
      'sass-loader'
    ]
  });

  plugins.push(new WebpackBar({ name: 'Client' }));
  plugins.push(
    new MiniCssExtractPlugin({
      filename: '[name]/client/[fullhash].css'
    })
  );
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
};
