const { resolve } = require('path');
const { readdirSync } = require('fs');
const { getConfig } = require('../../src/lib/util/getConfig');

module.exports.getAllExtensions = function getAllExtensions(path) {
  return readdirSync(resolve(path), { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => {
      return {
        name: dirent.name, path: resolve(path, dirent.name)
      }
    });
}
module.exports.getEnabledExtensions = function getEnabledExtensions(path) {
  const extenstions = getConfig('system.extensions', []);
  const all = module.exports.getAllExtensions(path);
  return extenstions.filter((extension) => {
    if (
      all.find((e) => e.name === extension.name)
      && extension.enabled === true
    ) {
      return true;
    } else {
      return false;
    }
  })
    .map((extension) => {
      return {
        name: extension.name,
        path: resolve(path, extension.name)
      }
    })
}