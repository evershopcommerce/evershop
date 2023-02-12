const { resolve } = require('path');
const { readdirSync } = require('fs');
module.exports = exports = {};

var coreModules = [];

exports.loadModules = function loadModule(path) {
  return readdirSync(path, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => {
      return { name: dirent.name, path: resolve(path, dirent.name) };
    });
};

exports.getCoreModules = function getCoreModules() {
  if (coreModules.length === 0) {
    coreModules = exports.loadModules(resolve(__dirname, '../../src/modules'));
  }
  return coreModules;
};
