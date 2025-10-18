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
          const jsFiles = htmlWebpackPlugin.files.js;
          const cssFiles = htmlWebpackPlugin.files.css;

          // Filter out the incorrect vendor chunk based on route type
          const filteredJsFiles = jsFiles.filter((file) => {
            if (route.isAdmin) {
              // For admin routes, exclude frontstore-vendor
              return !file.includes('/frontstore-vendor/');
            } else {
              // For frontStore routes, exclude admin-vendor
              return !file.includes('/admin-vendor/');
            }
          });

          return JSON.stringify({
            js: filteredJsFiles,
            css: cssFiles
          });
        },
        filename: path.resolve(
          getRouteBuildPath(route),
          'client',
          'index.json'
        ),
        chunks: (() => {
          // Only 2 vendor chunks now - no shared vendor
          const chunks = ['common', subPath];

          // Add context-specific vendor and components
          if (route.isAdmin) {
            chunks.unshift('admin-vendor'); // Add admin vendor first
            chunks.splice(-1, 0, 'admin-components'); // Insert admin components before route-specific chunk
          } else {
            chunks.unshift('frontstore-vendor'); // Add frontstore vendor first
            chunks.splice(-1, 0, 'frontstore-components'); // Insert frontstore components before route-specific chunk
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

  config.optimization = {
    ...config.optimization,
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // Admin vendor chunk - includes ALL node_modules used by admin routes
        // (including shared dependencies like React)
        adminVendor: {
          test: (module, { chunkGraph }) => {
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

              // Include if this module is used by any admin route
              const chunks = chunkGraph.getModuleChunks(module);
              const usedByAdmin = Array.from(chunks).some((chunk) => {
                const route = routes.find((r) => {
                  const subPath = getRouteBuildSubPath(r);
                  return chunk.name === subPath;
                });
                return route && route.isAdmin;
              });

              return usedByAdmin;
            }
            return false;
          },
          name: 'admin-vendor',
          chunks: 'all',
          enforce: true,
          priority: 20
        },
        // FrontStore vendor chunk - includes ALL node_modules used by frontStore routes
        // (including shared dependencies like React)
        frontStoreVendor: {
          test: (module, { chunkGraph }) => {
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

              // Include if this module is used by any frontStore route
              const chunks = chunkGraph.getModuleChunks(module);
              const usedByFrontStore = Array.from(chunks).some((chunk) => {
                const route = routes.find((r) => {
                  const subPath = getRouteBuildSubPath(r);
                  return chunk.name === subPath;
                });
                return route && !route.isAdmin;
              });

              return usedByFrontStore;
            }
            return false;
          },
          name: 'frontstore-vendor',
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
