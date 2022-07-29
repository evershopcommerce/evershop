const path = require('path');
const { CONSTANTS } = require("../helpers")
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const isProductionMode = require('../util/isProductionMode');

module.exports.createBaseConfig = function createBaseConfig(
  isServer
) {
  const loaders = [
    {
      test: /\/views|components|context\/(.*).js?$/,
      //test: /\.js?$/,
      exclude: /(bower_components)/,
      use: {
        loader: 'babel-loader?cacheDirectory',
        options: {
          sourceType: 'unambiguous',
          cacheDirectory: true,
          presets: [
            [
              "@babel/preset-env",
              {
                "exclude": ["@babel/plugin-transform-regenerator", "@babel/plugin-transform-async-to-generator"]
              }
            ],
            '@babel/preset-react'
          ]
        }
      }
    }
  ];

  if (isServer) {
    loaders.push({
      test: /\.scss$/i,
      use: [
        {
          loader: path.resolve(CONSTANTS.LIBPATH, 'webpack/loaders/styleLoader.js'),
        }
      ],
    })
  } else {
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
    })
  }

  const plugins = [
    new webpack.ProgressPlugin()
  ];

  if (isServer === false) {
    plugins.push(new HtmlWebpackPlugin({
      filename: 'index.json',
      templateContent: ({ htmlWebpackPlugin }) => {
        const files = htmlWebpackPlugin.files.js;

        return JSON.stringify(files);
      },
      inject: false
    }));
  };

  const output = isServer ? {
    path: CONSTANTS.BUILDPATH,
    publicPath: CONSTANTS.BUILDPATH,
    filename: isServer === true ? '[name]/server/index.js' : '[name]/client/index.js'
  } : {
    publicPath: '/',
  };

  if (isServer) {
    output.libraryTarget = 'commonjs2';
    output.globalObject = 'this';
  };

  return {
    mode: isProductionMode() ? "production" : "development",
    module: {
      rules: loaders
    },
    target: isServer === true ? 'node12.18' : 'web',
    output: output,
    // optimization: {
    //   splitChunks: {
    //     chunks: 'all',
    //     cacheGroups: {
    //       commons: {
    //         test: /[\\/]node_modules[\\/]/,
    //         name: isServer ? 'vendors' : 'vendors',
    //         chunks: 'all',
    //       }
    //     },
    //   },
    // },
    plugins: plugins
  }
}