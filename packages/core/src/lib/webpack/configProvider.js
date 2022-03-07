/* eslint-disable no-multi-assign */
const path = require('path');

module.exports = exports = function CreateConfig(routeId, params) {
  const Config = {
    module: {
      rules: [
        {
          test: /\.jsx?$/,
          loader: 'babel-loader',
          query: {
            presets: [
              '@babel/preset-env',
              '@babel/preset-react'
            ]
          }
        }
      ]
    },

    mode: 'development',

    // name: 'main',
    target: 'web',

    entry: {
      server: [
        '@babel/polyfill',
        '../components/html.js'
      ]
    },
    output: {
      path: path.resolve(__dirname, 'public', 'js', 'build'),
      filename: 'server.js'
    },
    output: {
      path: path.resolve(__dirname, 'public', 'js', 'build'),
      filename: 'server.js',
      libraryTarget: 'commonjs',
      library: 'EntryPoint'
    }
  };

  return Config;
};
