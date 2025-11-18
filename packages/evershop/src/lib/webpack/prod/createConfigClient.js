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
        // Admin vendor chunk - includes third-party node_modules used by admin routes
        // Excludes @evershop/evershop core and extensions
        adminVendor: {
          test: (module) => {
            // Only match JS modules from node_modules, exclude CSS
            if (module.type === 'css/mini-extract') {
              return false;
            }

            // Must be from node_modules
            if (!module.resource) {
              return false;
            }

            // Normalize path separators for cross-platform compatibility
            const normalizedResource = module.resource.replace(/\\/g, '/');

            if (!normalizedResource.includes('node_modules')) {
              return false;
            }

            // Exclude @evershop/evershop core package
            if (
              normalizedResource.includes('node_modules/@evershop/evershop')
            ) {
              return false;
            }

            // Exclude extensions (they may be npm packages in node_modules)
            for (const ext of extenions) {
              if (ext.resolve) {
                const normalizedExtResolve = ext.resolve.replace(/\\/g, '/');
                if (normalizedResource.includes(normalizedExtResolve)) {
                  return false;
                }
              }
            }

            return true;
          },
          chunks: (chunk) => {
            // Only split from admin route chunks
            const route = routes.find((r) => {
              const subPath = getRouteBuildSubPath(r);
              return chunk.name === subPath;
            });
            return route && route.isAdmin;
          },
          name: 'admin-vendor',
          enforce: true,
          priority: 20
        },
        // FrontStore vendor chunk - includes third-party node_modules used by frontStore routes
        // Excludes @evershop/evershop core and extensions
        frontStoreVendor: {
          test: (module) => {
            // Only match JS modules from node_modules, exclude CSS
            if (module.type === 'css/mini-extract') {
              return false;
            }

            // Must be from node_modules
            if (!module.resource) {
              return false;
            }

            // Normalize path separators for cross-platform compatibility
            const normalizedResource = module.resource.replace(/\\/g, '/');

            if (!normalizedResource.includes('node_modules')) {
              return false;
            }

            // Exclude @evershop/evershop core package
            if (
              normalizedResource.includes('node_modules/@evershop/evershop')
            ) {
              return false;
            }

            // Exclude extensions (they may be npm packages in node_modules)
            for (const ext of extenions) {
              if (ext.resolve) {
                const normalizedExtResolve = ext.resolve.replace(/\\/g, '/');
                if (normalizedResource.includes(normalizedExtResolve)) {
                  return false;
                }
              }
            }

            return true;
          },
          chunks: (chunk) => {
            // Only split from frontStore route chunks
            const route = routes.find((r) => {
              const subPath = getRouteBuildSubPath(r);
              return chunk.name === subPath;
            });
            return route && !route.isAdmin;
          },
          name: 'frontstore-vendor',
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
