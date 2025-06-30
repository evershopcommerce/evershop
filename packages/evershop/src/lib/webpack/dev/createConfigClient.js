import path from 'path';
import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin';
import webpack from 'webpack';
import { getComponentsByRoute } from '../../componee/getComponentsByRoute.js';
import { CONSTANTS } from '../../helpers.js';
import { createBaseConfig } from '../createBaseConfig.js';
import { GraphqlPlugin } from '../plugins/GraphqlPlugin.js';

export function createConfigClient(route) {
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
        loader: path.resolve(
          CONSTANTS.LIBPATH,
          'webpack/loaders/TailwindLoader.js'
        ),
        options: {
          getComponents: () => getComponentsByRoute(route),
          route
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
    // Widgets
    // const widgets = getEnabledWidgets();
    // if (!route.isAdmin) {
    //   Object.keys(widgets).forEach((widget) => {
    //     entry[route.id].push(widgets[widget].component);
    //   });
    // }
    return entry;
  };
  config.watchOptions = {
    aggregateTimeout: 300,
    poll: 1000
  };

  // Enable source maps
  config.devtool = 'eval-cheap-module-source-map';
  return config;
}
