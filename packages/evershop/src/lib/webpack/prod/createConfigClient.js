import path from 'path';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import WebpackBar from 'webpackbar';
import { getEnabledExtensions } from '../../../bin/extension/index.js';
import { CONSTANTS } from '../../helpers.js';
import { createBaseConfig } from '../createBaseConfig.js';
import { getRouteBuildPath } from '../getRouteBuildPath.js';
import { getRouteBuildSubPath } from '../getRouteBuildSubPath.js';
import { isBuildRequired } from '../isBuildRequired.js';
import { Tailwindcss } from '../plugins/Tailwindcss.js';

export function createConfigClient(routes) {
  const extenions = getEnabledExtensions();
  const config = createBaseConfig(false);
  const { plugins } = config;
  const entry = {};
  routes.forEach((route) => {
    if (!isBuildRequired(route)) {
      return;
    }
    const subPath = getRouteBuildSubPath(route);
    entry[subPath] = [
      path.resolve(CONSTANTS.BUILDPATH, subPath, 'client', 'entry.js')
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
        chunks: (() => {
          // Base chunks that all routes get
          const chunks = ['vendor', 'common', subPath];

          // Add admin components chunk for admin routes
          if (route.isAdmin) {
            chunks.splice(-1, 0, 'admin-components'); // Insert before route-specific chunk
          } else {
            // Add frontstore components chunk for non-admin routes
            chunks.splice(-1, 0, 'frontstore-components'); // Insert before route-specific chunk
          }

          return chunks;
        })(),
        chunksSortMode: 'manual',
        inject: false,
        publicPath: '/assets/'
      })
    );
    plugins.push(new Tailwindcss(route));
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
        loader: 'sass-loader',
        options: {
          sassOptions: { implementation: 'sass' },
          api: 'modern'
        }
      }
    ]
  });

  plugins.push(new WebpackBar({ name: 'Client' }));
  plugins.push(
    new MiniCssExtractPlugin({
      filename: '[name]/client/[contenthash].css',
      chunkFilename: '[name]/client/[id].[contenthash].css'
    })
  );

  config.entry = entry;
  config.output.filename = '[name]/client/[fullhash].js';
  config.name = 'Client';

  // Add splitChunks optimization for shared dependencies
  config.optimization = {
    ...config.optimization,
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // Vendor chunk for all node_modules
        vendor: {
          test: (module) => {
            if (module.resource && module.resource.includes('node_modules')) {
              // Exclude @evershop/evershop and all extensions from vendor chunk
              if (module.resource.includes('node_modules/@evershop/evershop')) {
                return false;
              }
              // Check if module is from any enabled extension
              for (const ext of extenions) {
                if (ext.resolve && module.resource.includes(ext.resolve)) {
                  return false;
                }
              }
              return true;
            }
            return false;
          },
          name: 'vendor',
          chunks: 'all',
          enforce: true,
          priority: 20
        },
        // Common chunk for @components/common (shared across all routes)
        common: {
          test: /[\\/]@components[\\/]common[\\/]/,
          name: 'common',
          chunks: 'all',
          enforce: true,
          priority: 15
        },
        // Admin components chunk (only for admin routes)
        adminComponents: {
          test: /[\\/]@components[\\/]admin[\\/]/,
          name: 'admin-components',
          chunks: 'all',
          enforce: true,
          priority: 10
        },
        // FrontStore components chunk (only for frontStore routes)
        frontStoreComponents: {
          test: /[\\/]@components[\\/]frontStore[\\/]/,
          name: 'frontstore-components',
          chunks: 'all',
          enforce: true,
          priority: 10
        },
        // Default group to prevent CSS duplication across chunks
        default: false,
        defaultVendors: false
      }
    }
  };

  return config;
}
