import path from 'path';
import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin';
import webpack from 'webpack';
import { getEnabledExtensions } from '../../../bin/extension/index.js';
import { getComponentsByRoute } from '../../componee/getComponentsByRoute.js';
import { CONSTANTS } from '../../helpers.js';
import { createBaseConfig } from '../createBaseConfig.js';
import { GraphqlPlugin } from '../plugins/GraphqlPlugin.js';
import { ThemeWatcherPlugin } from '../plugins/ThemeWatcherPlugin.js';

export function createConfigClient(route, tailwindConfig) {
  const extensions = getEnabledExtensions();
  const config = createBaseConfig(false);
  config.name = route.id;

  const loaders = config.module.rules;
  loaders.unshift({
    test: /common[\\/]react[\\/]client[\\/]Index\.js$/i,
    use: [
      {
        loader: path.resolve(
          CONSTANTS.LIBPATH,
          'webpack/loaders/AreaLoader.js'
        ),
        options: {
          getComponents: () => getComponentsByRoute(route),
          route
        }
      }
    ]
  });

  loaders.push({
    test: /\.(css|scss)$/i,
    use: [
      {
        loader: 'style-loader',
        options: {}
      },
      {
        loader: 'css-loader',
        options: {
          url: false
        }
      },
      {
        loader: 'postcss-loader',
        options: {
          postcssOptions: {
            plugins: [
              [
                'tailwindcss',
                {
                  config: tailwindConfig
                }
              ],
              'autoprefixer'
            ]
          }
        }
      },
      {
        loader: 'sass-loader',
        options: {
          implementation: 'sass',
          api: 'modern'
        }
      }
    ]
  });

  loaders.push({
    test: /Client\.js$/,
    use: [
      {
        loader: path.resolve(
          CONSTANTS.LIBPATH,
          'webpack/loaders/GraphQLAPILoader.js'
        ),
        options: {
          isAdmin: route.isAdmin
        }
      }
    ]
  });

  const { plugins } = config;
  plugins.push(new GraphqlPlugin(route));
  plugins.push(new webpack.ProgressPlugin());
  plugins.push(new webpack.HotModuleReplacementPlugin());
  plugins.push(
    new ReactRefreshWebpackPlugin({
      overlay: false
    })
  );
  plugins.push(new ThemeWatcherPlugin());

  config.entry = () => {
    const entry = {};

    entry[route.id] = [
      ...getComponentsByRoute(route),
      path.resolve(
        CONSTANTS.MODULESPATH,
        '../components/common/react/client/Index.js'
      ),
      `webpack-hot-middleware/client?path=/eHot/${route.id}&reload=true&overlay=true`
    ];
    return entry;
  };
  config.watchOptions = {
    aggregateTimeout: 300,
    ignored: new RegExp('(^|/)[a-z][^/]*.js$'),
    poll: 1000
  };

  // Enable source maps
  config.devtool = 'eval-cheap-module-source-map';

  // Configure snapshot management for better caching
  // Exclude @evershop/evershop core and extensions in node_modules from managed paths
  // This ensures webpack watches for changes in these paths
  const nodeModuleExtensions = extensions
    .filter((ext) => ext.path && ext.path.includes('node_modules'))
    .map((ext) => {
      // Extract package name from path (e.g., @vendor/package or package-name)
      const match = ext.path.match(
        /node_modules[\\/](@[^/\\]+[\\/][^/\\]+|[^/\\]+)/
      );
      return match ? match[1].replace(/\\/g, '[\\\\/]') : null;
    })
    .filter(Boolean)
    .join('|');

  const managedPathsPattern = nodeModuleExtensions
    ? `^(.+?[\\\\/]node_modules[\\\\/](?!(@evershop[\\\\/]evershop|${nodeModuleExtensions}))(@.+?[\\\\/])?.+?)[\\\\/]`
    : `^(.+?[\\\\/]node_modules[\\\\/](?!(@evershop[\\\\/]evershop))(@.+?[\\\\/])?.+?)[\\\\/]`;

  config.snapshot = {
    managedPaths: [new RegExp(managedPathsPattern)]
  };

  return config;
}
