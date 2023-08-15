const path = require('path');
const WebpackBar = require('webpackbar');
const { CONSTANTS } = require('../../helpers');
const { createBaseConfig } = require('../createBaseConfig');
const { getRouteBuildSubPath } = require('../getRouteBuildSubPath');
const { isBuildRequired } = require('../isBuildRequired');

module.exports.createConfigServer = function createConfigServer(routes) {
  const entry = {};
  routes.forEach((route) => {
    if (!isBuildRequired(route)) {
      return;
    }
    const subPath = getRouteBuildSubPath(route);
    entry[subPath] = [
      path.resolve(CONSTANTS.BUILDPATH, subPath, 'server', 'entry.jsx'),
      path.resolve(
        CONSTANTS.LIBPATH,
        '../components/common/',
        'react',
        'server',
        'render.jsx'
      )
    ];
  });
  const config = createBaseConfig(true);
  const { plugins } = config;
  plugins.push(new WebpackBar({ name: 'Server', color: 'orange' }));

  const loaders = config.module.rules;
  loaders.push({
    test: /\.(css|scss)$/i,
    use: [
      {
        loader: path.resolve(
          CONSTANTS.LIBPATH,
          'webpack/loaders/StyleLoader.js'
        )
      }
    ]
  });
  config.entry = entry;
  config.name = 'Server';

  return config;
};
