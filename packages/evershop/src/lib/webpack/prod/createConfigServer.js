import path from 'path';
import WebpackBar from 'webpackbar';
import { CONSTANTS } from '../../helpers.js';
import { createBaseConfig } from '../createBaseConfig.js';
import { isBuildRequired } from '../isBuildRequired.js';

export function createConfigServer(routes) {
  // Phase 2: one server (SSR) bundle per CONTEXT (frontStore, admin) instead of
  // one self-contained bundle per route. Each context bundle imports every one
  // of its routes' components once (webpack dedupes the shared module graph) and
  // registers each route's component map via setAreaComponents; `renderHtml` +
  // `Area` select the current route at render time. This removes the per-route
  // vendor duplication (~React×N) that bloated the server output and build.
  const entry = {};
  const contexts = new Set();
  routes.forEach((route) => {
    if (!isBuildRequired(route)) {
      return;
    }
    contexts.add(route.isAdmin ? 'admin' : 'frontStore');
  });
  contexts.forEach((ctx) => {
    entry[ctx] = [
      path.resolve(CONSTANTS.BUILDPATH, ctx, 'server', 'entry.js')
    ];
  });
  const config = createBaseConfig(true);
  const { plugins } = config;
  plugins.push(new WebpackBar({ name: 'Server', color: '#FFA500' }));

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

  // Server bundles are executed by Node for SSR and are never sent to the
  // browser, so minifying them buys nothing — and minification (holding every
  // emitted bundle + its source map in memory at once) is the single biggest
  // driver of the build's peak heap. Disabling it here keeps the server
  // compilation within a ~2GB heap so the production build fits on small
  // (e.g. 2vCPU/4GB) hosts. See specifications/store-front-architecture-audit.md.
  config.optimization = config.optimization || {};
  config.optimization.minimize = false;
  config.optimization.minimizer = [];

  return config;
}
