const { existsSync, rmSync, mkdirSync } = require('fs');
const path = require('path');
const { CONSTANTS } = require('@evershop/evershop/src/lib/helpers');
const {
  loadModuleRoutes
} = require('@evershop/evershop/src/lib/router/loadModuleRoutes');
const { getRoutes } = require('@evershop/evershop/src/lib/router/Router');
const {
  isBuildRequired
} = require('@evershop/evershop/src/lib/webpack/isBuildRequired');
const { buildEntry } = require('@evershop/evershop/bin/lib/buildEntry');
const { getCoreModules } = require('@evershop/evershop/bin/lib/loadModules');
const { error } = require('@evershop/evershop/src/lib/log/debuger');
const { compile } = require('./complie');
const { getEnabledExtensions } = require('../extension');

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

(async () => {
  const routes = getRoutes();
  await buildEntry(routes.filter((r) => isBuildRequired(r)));

  /** Build  */
  await compile(routes);
})();
