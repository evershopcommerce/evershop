import path from 'path';
import WebpackBar from 'webpackbar';
import { CONSTANTS } from '../../helpers.js';
import { createBaseConfig } from '../createBaseConfig.js';
import { getRouteBuildSubPath } from '../getRouteBuildSubPath.js';
import { isBuildRequired } from '../isBuildRequired.js';

export function createConfigServer(routes) {
  const entry = {};
  routes.forEach((route) => {
    if (!isBuildRequired(route)) {
      return;
    }
    const subPath = getRouteBuildSubPath(route);
    entry[subPath] = [
      path.resolve(CONSTANTS.BUILDPATH, subPath, 'server', 'entry.js')
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
}
