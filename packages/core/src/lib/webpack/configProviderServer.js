/* eslint-disable no-multi-assign */
const path = require('path');
const { CONSTANTS } = require('../helpers');

module.exports = exports = {};

exports.createConfig = function createConfig(scopePath) {
  const entry = {};
  entry[scopePath] = [
    path.resolve(CONSTANTS.ROOTPATH, './.evershop/build', scopePath, 'components.js'),
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
                componentsPath: path.resolve(CONSTANTS.ROOTPATH, './.evershop/build', scopePath, 'components.js')
              }
            }
          ]
        }
      ]
    },
    // name: 'main',
    target: 'node',
    entry,
    output: {
      path: path.resolve(CONSTANTS.ROOTPATH, './.evershop/build', scopePath),
      filename: '[fullhash].js',
      libraryTarget: 'commonjs2',
      globalObject: 'this'
    },
    resolve: {
      alias: {
        react: path.resolve(CONSTANTS.NODEMODULEPATH, 'react')
      }
    }
  };

  return Config;
};
