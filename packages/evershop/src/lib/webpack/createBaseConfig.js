const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const { getCoreModules } = require('@evershop/evershop/bin/lib/loadModules');
const { CONSTANTS } = require('../helpers');
const isProductionMode = require('../util/isProductionMode');
const { getEnabledExtensions } = require('../../../bin/extension');
const { getConfig } = require('../util/getConfig');
const { loadCsvTranslationFiles } = require('./loaders/loadTranslationFromCsv');

module.exports.createBaseConfig = function createBaseConfig(isServer) {
  const extenions = getEnabledExtensions();
  const coreModules = getCoreModules();
  const theme = getConfig('system.theme', null);

  const loaders = [
    {
      test: /\.jsx$/,
      exclude: {
        and: [/node_modules/],
        not: [
          /@evershop[\\/]evershop/,
          // Include all enabled extension;
          ...extenions.map((ext) => {
            const regex = new RegExp(
              ext.resolve.replace(/\\/g, '[\\\\\\]').replace(/\//g, '[\\\\/]')
            );
            return regex;
          })
        ]
      },
      use: [
        {
          loader: path.resolve(
            CONSTANTS.LIBPATH,
            'webpack/loaders/LayoutLoader.js'
          )
        },
        {
          loader: path.resolve(
            CONSTANTS.LIBPATH,
            'webpack/loaders/GraphqlLoader.js'
          )
        },
        {
          loader: 'babel-loader?cacheDirectory',
          options: {
            sourceType: 'unambiguous',
            cacheDirectory: true,
            presets: [
              [
                '@babel/preset-env',
                {
                  targets: {
                    esmodules: true
                  },
                  exclude: [
                    '@babel/plugin-transform-regenerator',
                    '@babel/plugin-transform-async-to-generator'
                  ]
                }
              ],
              '@babel/preset-react'
            ]
          }
        },
        {
          loader: path.resolve(
            CONSTANTS.LIBPATH,
            'webpack/loaders/TranslationLoader.js'
          ),
          options: {
            getTranslateData: async () => {
              const result = await loadCsvTranslationFiles();
              return result;
            }
          }
        }
      ]
    }
  ];

  const output = isServer
    ? {
        path: CONSTANTS.BUILDPATH,
        publicPath: CONSTANTS.BUILDPATH,
        filename:
          isServer === true
            ? '[name]/server/index.js'
            : '[name]/client/index.js',
        pathinfo: false
      }
    : {
        path: CONSTANTS.BUILDPATH,
        publicPath: isProductionMode() ? '/assets/' : '/',
        pathinfo: false
      };

  if (!isProductionMode()) {
    Object.assign(output, {
      chunkFilename: (pathData) =>
        `${pathData.chunk.renderedHash}/client/${pathData.chunk.runtime}.js`
    });
  } else {
    Object.assign(output, {
      chunkFilename: (pathData) => `chunks/${pathData.chunk.renderedHash}.js`
    });
  }

  if (isServer) {
    output.libraryTarget = 'commonjs2';
    output.globalObject = 'this';
  }

  const config = {
    mode: isProductionMode() ? 'production' : 'development',
    module: {
      rules: loaders
    },
    target: isServer === true ? 'node12.18' : 'web',
    output,
    plugins: [],
    cache: { type: 'memory' }
  };

  // Resolve aliases
  const alias = {};
  if (theme) {
    alias['@components'] = [
      path.resolve(CONSTANTS.THEMEPATH, theme, 'components')
    ];
  } else {
    alias['@components'] = [];
  }

  // Resolve alias for extensions
  extenions.forEach((ext) => {
    alias['@components'].push(path.resolve(ext.resolve, 'components'));
  });
  alias['@components'].push(path.resolve(__dirname, '../../components'));

  // Resolve alias for core components
  alias['@components-origin'] = path.resolve(__dirname, '../../components');

  // Resolve alias for core module pages
  coreModules.forEach((mod) => {
    alias[`@default-theme/${mod.name.toLowerCase()}`] = path.resolve(
      mod.path,
      'pages'
    );
  });

  config.resolve = {
    alias,
    extensions: ['.js', '.jsx', '.json', '.wasm']
  };

  config.optimization = {};

  // Check if the flag --skip-minify is set
  const skipMinify = process.argv.includes('--skip-minify');
  if (isProductionMode()) {
    config.optimization = Object.assign(config.optimization, {
      minimize: !skipMinify,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            parse: {
              ecma: 2020
            },
            compress: {
              unused: true,
              dead_code: true
            },
            mangle: {
              safari10: true
            },
            output: {
              ecma: 5,
              comments: false,
              ascii_only: true
            }
          }
        })
      ]
    });
  }

  return config;
};
