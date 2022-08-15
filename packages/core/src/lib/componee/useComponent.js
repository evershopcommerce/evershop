const { existsSync } = require('fs');
const { resolve, join } = require('path');
const { getCoreModules } = require('../../../bin/lib/loadModules');
const { getEnabledPlugins } = require('../../../bin/plugin');
const { CONSTANTS } = require('../helpers');
const { getConfig } = require('../util/getConfig');
const { Componee } = require('./Componee');

// eslint-disable-next-line no-multi-assign
module.exports = exports = {};

/**
 * @private
*/
exports.getComponent = function getComponent(scope, module, path) {
  const theme = getConfig('shop.siteTheme');
  const plugins = getEnabledPlugins();
  const coreModules = getCoreModules();
  const m = coreModules.find((m) => m.name === module) || plugins.find((p) => p.name === module);
  if (!m) {
    throw new Error(`Component ${module} does not exist`);
  }
  if (theme && existsSync(join(CONSTANTS.SITETHEMEPATH, theme, m.path, scope, path))) {
    return resolve(CONSTANTS.SITETHEMEPATH, theme, m.path, scope, path);
  } else if (existsSync(resolve(m.path, 'views', scope, path))) {
    return resolve(m.path, 'views', scope, path);
  } else if (existsSync(resolve(CONSTANTS.LIBPATH, 'components', path))) {
    return resolve(CONSTANTS.LIBPATH, 'components', path);
  } else {
    throw new Error(`Could not resolve component ${path}`);
  }
};

exports.useComponent = function useComponent(path, module = null) {
  const currentScope = Componee.currentScope;
  const currentModule = module || Componee.currentModule;
  return exports.getComponent(currentScope, currentModule, path);
}