const { existsSync } = require('fs');
const { resolve } = require('path');
const { CONSTANTS } = require('../../src/lib/helpers');
const { getConfig } = require('../../src/lib/util/getConfig');
const { getCoreModules } = require('../lib/loadModules');

var extensions = [];

function loadExtensions() {
  const coreModules = getCoreModules()
  const list = getConfig('system.extensions', []);
  const extensions = [];
  list.forEach((extension) => {
    if (coreModules.find((module) => module.name === extension.name) ||
      extensions.find((e) => e.name === extension.name)
    ) {
      throw new Error(`Extension ${extension.name} is invalid. extension name must be unique.`);
    }
    if (extension.enabled === true && existsSync(resolve(CONSTANTS.ROOTPATH, extension.resolve))) {
      extensions.push({ ...extension, path: resolve(CONSTANTS.ROOTPATH, extension.resolve) });
    } else {
      console.log(`Extension ${extension.name} is either disabled or the path is not existed.`);
    }
  });

  return extensions;
}

module.exports.getEnabledExtensions = function getEnabledExtensions() {
  if (extensions.length === 0) {
    extensions = loadExtensions();
  }
  return extensions;
}