import path from 'path';
import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin';
import webpack from 'webpack';
import { getEnabledExtensions } from '../../../bin/extension/index.js';
import { getComponentsByRoute } from '../../componee/getComponentsByRoute.js';
import { CONSTANTS } from '../../helpers.js';
import { getRoutes } from '../../router/Router.js';
import { createBaseConfig } from '../createBaseConfig.js';
import { GraphqlPlugin } from '../plugins/GraphqlPlugin.js';
import { ThemeWatcherPlugin } from '../plugins/ThemeWatcherPlugin.js';

export function createConfigClient(
  adminTailwindConfig,
  frontstoreTailwindConfig
) {
  const extensions = getEnabledExtensions();
  const config = createBaseConfig(false);
  config.name = 'bundle-client';

  const loaders = config.module.rules;
  loaders.unshift({
    test: /common[\\/]react[\\/]client[\\/]Index\.js$/i,
    use: [
      {
        loader: path.resolve(CONSTANTS.LIBPATH, 'webpack/loaders/AreaLoader.js')
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
          postcssOptions: (loaderContext) => {
            const { resourcePath } = loaderContext;
            const normalizedPath = resourcePath.replace(/\\/g, '/');

            if (normalizedPath.includes('/admin/all/global.scss')) {
              return {
                plugins: [
                  [
                    'tailwindcss',
                    {
                      config: adminTailwindConfig
                    }
                  ],
                  [
                    'postcss-prefix-selector',
                    {
                      prefix: '.admin',
                      transform: function (prefix, selector, prefixedSelector) {
                        // Don't prefix :root, html, body, or * selectors
                        if (
                          selector === ':root' ||
                          selector === 'html' ||
                          selector === 'body' ||
                          selector === '*'
                        ) {
                          return selector;
                        }
                        // Don't prefix selectors that already contain .admin
                        if (selector.includes('.admin')) {
                          return selector;
                        }
                        return prefixedSelector;
                      }
                    }
                  ],
                  'autoprefixer'
                ]
              };
            } else if (normalizedPath.includes('/frontStore/all/global.scss')) {
              return {
                plugins: [
                  [
                    'tailwindcss',
                    {
                      config: frontstoreTailwindConfig
                    }
                  ],
                  [
                    'postcss-prefix-selector',
                    {
                      prefix: '.frontStore',
                      transform: function (prefix, selector, prefixedSelector) {
                        // Don't prefix :root, html, body, or * selectors
                        if (
                          selector === ':root' ||
                          selector === 'html' ||
                          selector === 'body' ||
                          selector === '*'
                        ) {
                          return selector;
                        }
                        // Don't prefix selectors that already contain .frontStore
                        if (selector.includes('.frontStore')) {
                          return selector;
                        }
                        return prefixedSelector;
                      }
                    }
                  ],
                  'autoprefixer'
                ]
              };
            } else {
              // For other CSS/SCSS files, only use autoprefixer (skip Tailwind for performance)
              return {
                plugins: ['autoprefixer']
              };
            }
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

  const { plugins } = config;
  plugins.push(new GraphqlPlugin());
  plugins.push(new webpack.ProgressPlugin());
  plugins.push(new webpack.HotModuleReplacementPlugin());
  plugins.push(
    new ReactRefreshWebpackPlugin({
      overlay: false
    })
  );
  plugins.push(new ThemeWatcherPlugin());

  config.entry = () => {
    const routes = getRoutes();
    const entry = [
      path.resolve(
        CONSTANTS.MODULESPATH,
        '../components/common/react/client/Index.js'
      ),
      `webpack-hot-middleware/client?path=/eHot&reload=true&overlay=true`
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
  // Exclude @storefront/core core and extensions in node_modules from managed paths
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
    ? `^(.+?[\\\\/]node_modules[\\\\/](?!(@storefront[\\\\/]core|${nodeModuleExtensions}))(@.+?[\\\\/])?.+?)[\\\\/]`
    : `^(.+?[\\\\/]node_modules[\\\\/](?!(@storefront[\\\\/]core))(@.+?[\\\\/])?.+?)[\\\\/]`;

  config.snapshot = {
    managedPaths: [new RegExp(managedPathsPattern)]
  };

  return config;
}
