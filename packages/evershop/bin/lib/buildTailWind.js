const fs = require('fs');
const { mkdir, writeFile } = require('fs').promises;
const path = require('path');
const {
  getComponentsByRoute
} = require('@evershop/evershop/src/lib/componee/getComponentsByRoute');
const { CONSTANTS } = require('@evershop/evershop/src/lib/helpers');
const {
  getRouteBuildPath
} = require('@evershop/evershop/src/lib/webpack/getRouteBuildPath');
const dependencyTree = require('dependency-tree');
const {
  isBuildRequired
} = require('@evershop/evershop/src/lib/webpack/isBuildRequired');
const postcss = require('postcss');
const tailwindcss = require('tailwindcss');
const autoprefixer = require('autoprefixer');

/**
 * Only pass the page routes, not api routes
 */
module.exports.buildTailwind = async function buildTailwind(
  routes,
  clientOnly = false
) {
  await Promise.all(
    routes.map(async (route) => {
      if (!isBuildRequired(route)) {
        return;
      }
      const subPath = getRouteBuildPath(route);
      const components = getComponentsByRoute(route);
      if (!components) {
        return;
      }
      /** Build layout and query */
      let listModules = [];
      components.forEach((module) => {
        if (!fs.existsSync(module)) {
          return;
        }

        const list = dependencyTree.toList({
          filename: module,
          directory: CONSTANTS.ROOTPATH,
          filter: (path) =>
            path.indexOf('.js') !== -1 &&
            (path.indexOf('node_modules') === -1 ||
              path.indexOf('@evershop') !== -1)
        });

        listModules = [...listModules, ...list];
      });

      // Use PostCss to parse tailwind.css with tailwind config
      const defaultTailwindConfig = route.isAdmin
        ? require('@evershop/evershop/src/modules/cms/services/tailwind.admin.config.js')
        : require('@evershop/evershop/src/modules/cms/services/tailwind.frontStore.config.js');

      let tailwindConfig = {};
      if (route.isAdmin) {
        if (
          fs.existsSync(
            path.join(CONSTANTS.ROOTPATH, 'tailwind.admin.config.js')
          )
        ) {
          tailwindConfig = require(path.join(
            CONSTANTS.ROOTPATH,
            'tailwind.admin.config.js'
          ));
        }
      } else {
        if (
          fs.existsSync(
            path.join(CONSTANTS.ROOTPATH, 'tailwind.frontStore.config.js')
          )
        ) {
          tailwindConfig = require(path.join(
            CONSTANTS.ROOTPATH,
            'tailwind.frontStore.config.js'
          ));
        }
      }

      // Merge defaultTailwindConfig with tailwindConfigJs
      const mergedTailwindConfig = Object.assign(
        defaultTailwindConfig,
        tailwindConfig
      );
      // get list of modules that are used in the webpack build

      mergedTailwindConfig.content = listModules;

      // Postcss with tailwind plugin

      try {
        // The default tailwind file
        const c = `@tailwind base;
@tailwind components;
@tailwind utilities;`;
        const tailwindCssResult = postcss([
          tailwindcss(mergedTailwindConfig),
          autoprefixer
        ]).process(c);

        // get the css from the result
        const tailwindCss = tailwindCssResult.css;
        if (!fs.existsSync(path.resolve(subPath, 'client'))) {
          await mkdir(path.resolve(subPath, 'client'), { recursive: true });
        }
        await writeFile(
          path.resolve(subPath, 'client', 'tailwind.scss'),
          tailwindCss
        );
      } catch (error) {
        throw new Error(error);
      }
    })
  );
};
