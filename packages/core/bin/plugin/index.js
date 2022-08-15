const { existsSync } = require('fs');
const { resolve } = require('path');
const { CONSTANTS } = require('../../src/lib/helpers');
const { getConfig } = require('../../src/lib/util/getConfig');
const { getCoreModules } = require('../lib/loadModules');

var plugins = [];

function loadPlugins() {
  const coreModules = getCoreModules()
  const list = getConfig('system.plugins', []);
  const plugins = [];
  list.forEach((plugin) => {
    if (coreModules.find((module) => module.name === plugin.name) ||
      plugins.find((p) => p.name === plugin.name)
    ) {
      throw new Error(`Plugin ${plugin.name} is invalid. Plugin name must be unique.`);
    }
    if (plugin.enabled === true && existsSync(resolve(CONSTANTS.ROOTPATH, plugin.resolve))) {
      plugins.push({ ...plugin, path: resolve(CONSTANTS.ROOTPATH, plugin.resolve) });
    } else {
      console.log(`Plugin ${plugin.name} is either disabled or the path is not existed.`);
    }
  });

  return plugins;
}

module.exports.getEnabledPlugins = function getEnabledPlugins() {
  if (plugins.length === 0) {
    plugins = loadPlugins();
  }
  return plugins;
}