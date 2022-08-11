const path = require('path');
const { webpack } = require('webpack');
const { Componee } = require('../../src/lib/componee/Componee');
const { getRoutes } = require('../../src/lib/router/Router');
const { isBuildRequired } = require('../../src/lib/webpack/isBuildRequired');
const { createConfigClient } = require('../../src/lib/webpack/prod/createConfigClient');
const { createConfigServer } = require('../../src/lib/webpack/prod/createConfigServer');
const { createComponents } = require('../lib/createComponents');
const { loadModuleRoutes } = require('../lib/loadModuleRoutes');
const { loadModules } = require('../lib/loadModules');

/* Loading modules and initilize routes, components and services */
const modules = loadModules(path.resolve(__dirname, '../../src', 'modules'));

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
    Componee.loadModuleComponents(module.path);
  } catch (e) {
    console.log(e);
    process.exit(0);
  }
});

async function compile(routes) {
  const config = [createConfigClient(routes), createConfigServer(routes)];

  const compiler = webpack(config);

  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err || stats.hasErrors() || stats.hasWarnings()) {
        console.log(err);
        console.log(stats.toString({
          errorDetails: true,
          warnings: true
        }));
        reject(err);
      }
      resolve(stats);
    });
  }
  );
}

(async () => {
  const routes = getRoutes();
  await createComponents(routes.filter((r) => isBuildRequired(r)));

  /** Build  */
  await compile(routes);
})();