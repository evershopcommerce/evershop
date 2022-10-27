const { existsSync, rmSync, mkdirSync } = require('fs');
const path = require('path');
const { Componee } = require('../../src/lib/componee/Componee');
const { CONSTANTS } = require('../../src/lib/helpers');
const { getRoutes } = require('../../src/lib/router/Router');
const { isBuildRequired } = require('../../src/lib/webpack/isBuildRequired');
const { getEnabledExtensions } = require('../extension');
const { buildEntry } = require('../lib/buildEntry');
const { buildTailwind } = require('../lib/buildTailWind');
const { loadModuleRoutes } = require('../lib/loadModuleRoutes');
const { getCoreModules } = require('../lib/loadModules');
const { compile } = require('./complie');

/* Loading modules and initilize routes, components */
const modules = [...getCoreModules(), ...getEnabledExtensions()];

/** Loading routes  */
modules.forEach((module) => {
  try {
    // Load routes
    loadModuleRoutes(module.path);
  } catch (e) {
    console.log(e);
    process.exit(0);
  }
});

/** Loading components */
modules.forEach((module) => {
  try {
    // Load components
    Componee.loadModuleComponents(module);
  } catch (e) {
    console.log(e);
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
  await buildTailwind(routes.filter((r) => isBuildRequired(r)));
  await buildEntry(routes.filter((r) => isBuildRequired(r)));

  /** Build  */
  await compile(routes);
})();