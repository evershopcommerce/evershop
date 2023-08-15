const webpack = require('webpack');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const path = require('path');
const { createBaseConfig } = require('../createBaseConfig');
const { getComponentsByRoute } = require('../../componee/getComponentsByRoute');
const { CONSTANTS } = require('../../helpers');
const { GraphqlPlugin } = require('../plugins/GraphqlPlugin');

module.exports.createConfigClient = function createConfigClient(route) {
  const config = createBaseConfig(false);
  config.name = route.id;

  const loaders = config.module.rules;
  loaders.unshift({
    test: /common[\\/]react[\\/]client[\\/]Index\.jsx$/i,
    use: [
      {
        loader: path.resolve(
          CONSTANTS.LIBPATH,
          'webpack/loaders/AreaLoader.js'
        ),
        options: {
          getComponents: () => getComponentsByRoute(route),
          routeId: route.id
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
      'sass-loader'
    ]
  });

  loaders.push({
    test: /Client\.jsx$/,
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
        CONSTANTS.MOLDULESPATH,
        '../components/common/react/client/Index.jsx'
      ),
      `webpack-hot-middleware/client?path=/eHot/${route.id}&reload=true&overlay=true`
    ];

    return entry;
  };
  config.watchOptions = {
    aggregateTimeout: 300,
    poll: 1000
  };

  return config;
};
