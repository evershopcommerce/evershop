const { resolve } = require('path');
const { readdirSync } = require('fs');
module.exports = exports = {};

exports.loadModules = function loadModule(path) {
  return readdirSync(path, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => { return { name: dirent.name, path: resolve(path, dirent.name) } });
}