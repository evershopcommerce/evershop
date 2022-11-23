const path = require('path');
const { CONSTANTS } = require('../../helpers');
const { createBaseConfig } = require('../createBaseConfig');
const { getRouteBuildPath } = require('../getRouteBuildPath');
const { getRouteBuildSubPath } = require('../getRouteBuildSubPath');
const { isBuildRequired } = require('../isBuildRequired');
const WebpackBar = require('webpackbar');

module.exports.createConfigServer = function createConfigServer(routes) {
  const entry = {};
  routes.forEach((route) => {
    if (!isBuildRequired(route)) {
      return;
    }
    const subPath = getRouteBuildSubPath(route);
    entry[subPath] = [
      path.resolve(CONSTANTS.BUILDPATH, subPath, 'server', 'entry.js'),
      path.resolve(CONSTANTS.LIBPATH, 'components', 'react', 'server', 'render.js')
    ];
  });
  const config = createBaseConfig(true);
  const plugins = config.plugins;
  plugins.push(new WebpackBar({ name: 'Server', color: 'orange' }),)

  const loaders = config.module.rules;
  loaders.push({
    test: /\.scss$/i,
    use: [
      {
        loader: path.resolve(CONSTANTS.LIBPATH, 'webpack/loaders/styleLoader.js'),
      }
    ],
  })
  config.entry = entry;
  config.name = 'Server';

  return config;
}