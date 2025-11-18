import { existsSync, rmSync } from 'fs';
import path from 'path';
import { green, red } from 'kleur';
import ora from 'ora';
import webpack from 'webpack';
import { CONSTANTS } from '../../../src/lib/helpers.js';
import { getRoutes } from '../../../src/lib/router/routes.js';
import { createConfig } from '../../../src/lib/webpack/createConfig.js';
import { loadModuleComponents } from '../../serve/loadModuleComponents.js';
import { loadModuleRoutes } from '../../serve/loadModuleRoutes.js';
import { loadModules } from '../../serve/loadModules.js';
import { createComponents } from '../createComponents.js';

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
