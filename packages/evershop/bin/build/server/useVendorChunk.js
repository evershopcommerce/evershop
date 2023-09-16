const path = require('path');
const { existsSync, rmSync } = require('fs');
const { CONSTANTS } = require('@evershop/evershop/src/lib/helpers');
const ora = require('ora');
const { red, green } = require('kleur');
const { getRoutes } = require('@evershop/evershop/src/lib/router/routes');
const webpack = require('webpack');
const {
  createConfig
} = require('@evershop/evershop/src/lib/webpack/createConfig');
const { loadModuleComponents } = require('../../serve/loadModuleComponents');
const { loadModuleRoutes } = require('../../serve/loadModuleRoutes');
const { loadModules } = require('../../serve/loadModules');
const { createComponents } = require('../createComponents');

(async () => {
  const start = Date.now();
  const modules = loadModules(
    path.resolve(__dirname, '../../../src', 'modules')
  );
  const spinner = ora({
    text: green('Starting server build'),
    spinner: 'dots12'
  }).start();
  spinner.start();

  /** Initilizing routes */
  modules.forEach((module) => {
    try {
      // Load routes
      loadModuleRoutes(module.path);
    } catch (e) {
      spinner.fail(`${red(e.stack)}\n`);
      process.exit(0);
    }
  });

  /** Initializing components */
  modules.forEach((module) => {
    try {
      // Load components
      loadModuleComponents(module.path);
    } catch (e) {
      spinner.fail(`${red(e.stack)}\n`);
      process.exit(0);
    }
  });

  /** Get list of routes */
  const routes = getRoutes();

  /** Collect all 'controller' routes */
  const controllers = routes.filter((r) => r.isApi === false);

  /** Clean up the build directory */
  if (existsSync(CONSTANTS.BUILDPATH)) {
    rmSync(CONSTANTS.BUILDPATH, { recursive: true });
  }

  /** Create components.js file for each route */
  await createComponents(controllers);

  /** Create the webpack complier object */
  const compiler = webpack(createConfig(true, controllers));

  /** Run the build */
  await new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err) {
        reject(err);
      } else if (stats.hasErrors()) {
        reject(
          new Error(
            stats.toString({
              errorDetails: true,
              warnings: true
            })
          )
        );
      } else {
        resolve(stats);
      }
    });
  });

  const end = Date.now();
  spinner.succeed(`${green('Server build completed in')} ${end - start}ms`);
  process.exit(0);
})();
