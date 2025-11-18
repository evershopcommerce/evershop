import { existsSync, mkdirSync, rmSync } from 'fs';
import path from 'path';
import config from 'config';
import { CONSTANTS } from '../../lib/helpers.js';
import { error } from '../../lib/log/logger.js';
import { loadModuleRoutes } from '../../lib/router/loadModuleRoutes.js';
import { getRoutes } from '../../lib/router/Router.js';
import { lockHooks } from '../../lib/util/hookable.js';
import { lockRegistry } from '../../lib/util/registry.js';
import { validateConfiguration } from '../../lib/util/validateConfiguration.js';
import { isBuildRequired } from '../../lib/webpack/isBuildRequired.js';
import { getEnabledExtensions } from '../extension/index.js';
import { loadBootstrapScript } from '../lib/bootstrap/bootstrap.js';
import { buildEntry } from '../lib/buildEntry.js';
import { getCoreModules } from '../lib/loadModules.js';
import { compile } from './complie.js';
import './initEnvBuild.js';

/* Loading modules and initilize routes, components */
const modules = [...getCoreModules(), ...getEnabledExtensions()];

/** Loading routes  */
modules.forEach((module) => {
  try {
    // Load routes
    loadModuleRoutes(module.path);
  } catch (e) {
    error(e);
    process.exit(0);
  }
});

/** Clean up the build directory */
if (existsSync(path.resolve(CONSTANTS.BUILDPATH))) {
  // Delete directory recursively
  rmSync(path.resolve(CONSTANTS.BUILDPATH), { recursive: true });
  mkdirSync(path.resolve(CONSTANTS.BUILDPATH));
} else {
  mkdirSync(path.resolve(CONSTANTS.BUILDPATH), { recursive: true });
}
export default async function build() {
  /** Loading bootstrap script from modules */
  try {
    for (const module of modules) {
      await loadBootstrapScript(module, {
        command: 'build',
        env: 'production',
        process: 'main'
      });
    }
    lockHooks();
    lockRegistry();
    // Get the configuration (nodeconfig)
    validateConfiguration(config);
  } catch (e) {
    error(e);
    process.exit(0);
  }
  process.env.ALLOW_CONFIG_MUTATIONS = false;

  const routes = getRoutes();
  await buildEntry(routes.filter((r) => isBuildRequired(r)));

  /** Build  */
  await compile(routes);
}

process.on('uncaughtException', function (exception) {
  import('../../lib/log/logger.js').then((module) => {
    module.error(exception);
  });
});
process.on('unhandledRejection', (reason, p) => {
  import('../../lib/log/logger.js').then((module) => {
    module.error(`Unhandled Rejection: ${reason} at: ${p}`);
  });
});

build();
