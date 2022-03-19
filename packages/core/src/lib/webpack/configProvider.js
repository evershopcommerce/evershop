/* eslint-disable no-multi-assign */
const path = require('path');
const { CONSTANTS } = require('../helpers');

module.exports = exports = {};

exports.createConfig = function createConfig(scopePath) {
  const entry = {};
  entry[scopePath] = [
    path.resolve(CONSTANTS.ROOTPATH, './.nodejscart/build', scopePath, 'components.js'),
    path.resolve(CONSTANTS.LIBPATH, 'components', 'Hydrate.js')
  ];
  const Config = {
    mode: 'development', // "production" | "development" | "none"
    module: {
      rules: [
        {
          test: /\.jsx?$/,
          exclude: /(node_modules|bower_components)/,
          use: {
            loader: 'babel-loader',
            options: {
              sourceType: 'unambiguous',
              cacheDirectory: true,
              presets: [
                '@babel/preset-env',
                '@babel/preset-react'
              ],
              plugins: [
                '@babel/plugin-transform-runtime'
              ]
            }
          }
        },
        {
          test: /getComponents\.js/,
          use: [
            {
              loader: path.resolve(CONSTANTS.LIBPATH, 'webpack/getComponentLoader.js'),
              options: {
                componentsPath: path.resolve(CONSTANTS.ROOTPATH, './.nodejscart/build', scopePath, 'components.js')
              }
            }
          ]
        }
      ]
    },
    // name: 'main',
    target: 'web',
    entry,
    output: {
      path: path.resolve(CONSTANTS.ROOTPATH, './.nodejscart/build', scopePath),
      filename: '[fullhash].js'
    },
    resolve: {
      alias: {
        react: path.resolve(CONSTANTS.NODEMODULEPATH, 'react')
      }
    }
  };

  return Config;
};
