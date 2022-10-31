const path = require('path');
const { CONSTANTS } = require("../helpers");
const isProductionMode = require("../util/isProductionMode");
const TerserPlugin = require("terser-webpack-plugin");
const { getEnabledExtensions } = require('../../../bin/extension');

module.exports.createBaseConfig = function createBaseConfig(
  isServer
) {
  const extenions = getEnabledExtensions()
  const loaders = [
    {
      test: /\.m?js$/,
      exclude: {
        and: [/node_modules/],
        not: [
          /@evershop[\\/]core/,
          // Include all enabled extension; 
          ...extenions.map(ext => {
            const regex = new RegExp(ext.resolve.replace(/\\/g, '[\\\\\\]').replace(/\//g, '[\\\\/]'));
            return regex;
          })
        ]
      },
      use: [
        {
          loader: path.resolve(CONSTANTS.LIBPATH, 'webpack/loaders/LayoutLoader.js'),
        },
        {
          loader: path.resolve(CONSTANTS.LIBPATH, 'webpack/loaders/GraphqlLoader.js'),
        },
        {
          loader: 'babel-loader?cacheDirectory',
          options: {
            sourceType: 'unambiguous',
            cacheDirectory: true,
            presets: [
              [
                "@babel/preset-env",
                {
                  "targets": {
                    "esmodules": true
                  },
                  "exclude": ["@babel/plugin-transform-regenerator", "@babel/plugin-transform-async-to-generator"]
                }
              ],
              '@babel/preset-react'
            ]
          }
        }
      ]
    }
  ];

  const output = isServer ? {
    path: CONSTANTS.BUILDPATH,
    publicPath: CONSTANTS.BUILDPATH,
    filename: isServer === true ? '[name]/server/index.js' : '[name]/client/index.js',
    pathinfo: false
  } : {
    path: CONSTANTS.BUILDPATH,
    publicPath: isProductionMode() ? '/assets/' : '/',
    pathinfo: false
  };

  if (!isProductionMode()) {
    Object.assign(output, {
      chunkFilename: (pathData) => {
        return `${pathData.chunk.renderedHash}/client/${pathData.chunk.runtime}.js`;
      }
    });
  } else {
    Object.assign(output, {
      chunkFilename: (pathData) => {
        return `chunks/${pathData.chunk.renderedHash}.js`;
      }
    });
  }

  if (isServer) {
    output.libraryTarget = 'commonjs2';
    output.globalObject = 'this';
  };

  const config = {
    mode: isProductionMode() ? 'production' : 'development',
    module: {
      rules: loaders
    },
    target: isServer === true ? 'node12.18' : 'web',
    output: output,
    plugins: [],
    cache: { type: 'memory' }
  };

  config.optimization = {};
  if (isProductionMode()) {
    config.optimization = Object.assign(config.optimization, {
      minimize: true,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            parse: {
              // We want uglify-js to parse ecma 8 code. However, we don't want it
              // to apply any minification steps that turns valid ecma 5 code
              // into invalid ecma 5 code. This is why the 'compress' and 'output'
              // sections only apply transformations that are ecma 5 safe
              // https://github.com/facebook/create-react-app/pull/4234
              ecma: 2020,
            },
            compress: {
              ecma: 5,
              warnings: false,
            },
            mangle: {
              safari10: true,
            },
            output: {
              ecma: 5,
              comments: false,
              // Turned on because emoji and regex is not minified properly using
              // default. See https://github.com/facebook/create-react-app/issues/2488
              ascii_only: true,
            }
          }
        })
      ]
    });
  }

  return config;
}