import path from 'path';
import { fileURLToPath } from 'url';
import { SwcMinifyWebpackPlugin } from 'swc-minify-webpack-plugin';
import { getEnabledExtensions } from '../../bin/extension/index.js';
import { getCoreModules } from '../../bin/lib/loadModules.js';
import { CONSTANTS } from '../helpers.js';
import { getEnabledTheme } from '../util/getEnabledTheme.js';
import isProductionMode from '../util/isProductionMode.js';
import { loadCsvTranslationFiles } from './loaders/loadTranslationFromCsv.js';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createBaseConfig(isServer) {
  const extenions = getEnabledExtensions();
  const coreModules = getCoreModules();
  const theme = getEnabledTheme();

  const loaders = [
    {
      test: /\.m?js$/,
      resolve: {
        fullySpecified: false
      }
    },
    {
      test: /^[A-Z].*\.js$/,
      exclude: {
        and: [/node_modules/],
        not: [
          /@evershop[\\/]evershop/,
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
    output.library = {
      type: 'module'
    };
    output.module = true;
    output.chunkFormat = 'module';
    output.environment = { module: true };
    output.iife = false;
    output.scriptType = 'module';
  }
  const config = {
    mode: isProductionMode() ? 'production' : 'development',
    module: {
      rules: loaders
    },
    target: isServer === true ? 'node' : 'web',
    output,
    plugins: [],
    cache: { type: 'memory' }
  };

  if (isServer) {
    config.experiments = { outputModule: true };
  }

  // Resolve aliases
  const alias = {
    '@evershop/evershop/components': path.resolve(__dirname, '../../components')
  };
  if (theme) {
    alias['@components'] = [path.resolve(theme.path, 'dist/components')];
  } else {
    alias['@components'] = [];
  }

  // Resolve alias for extensions
  extenions.forEach((ext) => {
    alias['@components'].push(path.resolve(ext.resolve, 'dist/components'));
  });
  alias['@components'].push(path.resolve(__dirname, '../../components'));

  // Resolve alias for core components
  alias['@components-origin'] = path.resolve(__dirname, '../../components');

  // Avoid multiple react instances
  alias['react'] = path.resolve(CONSTANTS.ROOTPATH, 'node_modules/react');
  alias['react-dom'] = path.resolve(
    CONSTANTS.ROOTPATH,
    'node_modules/react-dom'
  );
  // Resolve alias for core module pages
  coreModules.forEach((mod) => {
    alias[`@default-theme/${mod.name.toLowerCase()}`] = path.resolve(
      mod.path,
      'pages'
    );
  });
  alias['webpack-hot-middleware'] = path.resolve(
    CONSTANTS.ROOTPATH,
    'node_modules/webpack-hot-middleware'
  );
  config.resolve = {
    alias,
    extensions: ['.js', '.json', '.wasm'],
    extensionAlias: {
      '.jsx': ['.js']
    }
  };

  config.optimization = {};

  // Check if the flag --skip-minify is set
  const skipMinify = process.argv.includes('--skip-minify');
  if (isProductionMode()) {
    config.optimization = Object.assign(config.optimization, {
      minimize: !skipMinify,
      minimizer: [
        new SwcMinifyWebpackPlugin({
          compress: true,
          mangle: true,
          module: true,
          sourceMap: true,
          keep_classnames: false,
          keep_fnames: false,
          safari10: true,
          sourceMap: true
        })
      ]
    });
  }

  return config;
}
