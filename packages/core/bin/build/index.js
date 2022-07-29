const path = require('path');
const {
  existsSync, rmSync
} = require('fs');
const { CONSTANTS } = require('../../src/lib/helpers');
const { loadModules } = require('../serve/loadModules');
const ora = require('ora');
const { red, green } = require('kleur');
const boxen = require('boxen');
const { loadModuleRoutes } = require('../serve/loadModuleRoutes');
const { loadModuleComponents } = require('../serve/loadModuleComponents');
const { getRoutes } = require('../../src/lib/router/routes');
const webpack = require('webpack');
const { createConfig } = require('../../src/lib/webpack/createConfig');
const { createComponents } = require('./createComponents');

(async () => {
  const start = Date.now();
  const modules = loadModules(path.resolve(__dirname, '../../src', 'modules'));

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
  const controllers = routes.filter((r) => (r.isApi === false));

  /** Clean up the build directory */
  if (existsSync(CONSTANTS.BUILDPATH)) {
    rmSync(CONSTANTS.BUILDPATH, { recursive: true });
  }

  /** Create components.js file for each route */
  await createComponents(controllers);

  // /** Create the server webpack complier object */
  // const serverCompiler = webpack(createConfig(true, controllers));

  // /** Create the client webpack complier object */
  // const clientCompiler = webpack(createConfig(false, controllers));


  // /** Run the build */
  // await Promise.all([
  //   new Promise((resolve, reject) => {
  //     serverCompiler.run((err, stats) => {
  //       if (err) {
  //         reject(err);
  //       } else if (stats.hasErrors()) {
  //         reject(new Error(stats.toString({
  //           errorDetails: true,
  //           warnings: true
  //         })));
  //       } else {
  //         resolve(stats);
  //       }
  //     });
  //   }),
  //   new Promise((resolve, reject) => {
  //     clientCompiler.run((err, stats) => {
  //       if (err) {
  //         reject(err);
  //       } else if (stats.hasErrors()) {
  //         reject(new Error(stats.toString({
  //           errorDetails: true,
  //           warnings: true
  //         })));
  //       } else {
  //         resolve(stats);
  //       }
  //     });
  //   })
  // ])

  const end = Date.now();
  process.exit(0);
})();