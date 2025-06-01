import path from 'path';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import WebpackBar from 'webpackbar';
import { CONSTANTS } from '../../helpers.js';
import { createBaseConfig } from '../createBaseConfig.js';
import { getRouteBuildPath } from '../getRouteBuildPath.js';
import { getRouteBuildSubPath } from '../getRouteBuildSubPath.js';
import { isBuildRequired } from '../isBuildRequired.js';
import { Tailwindcss } from '../plugins/Tailwindcss.js';

export function createConfigClient(routes) {
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
        chunks: [subPath],
        chunksSortMode: 'manual',
        inject: false,
        publicPath: '/assets/'
      })
    );

    plugins.push(new Tailwindcss(subPath, route));
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
        loader: path.resolve(
          CONSTANTS.LIBPATH,
          'webpack/loaders/TailwindLoader.js'
        ),
        options: {}
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
      filename: '[name]/client/[fullhash].css'
    })
  );

  config.entry = entry;
  config.output.filename = '[name]/client/[fullhash].js';
  config.name = 'Client';

  return config;
}
