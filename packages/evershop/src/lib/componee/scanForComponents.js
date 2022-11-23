/* eslint-disable global-require */
const { readdirSync } = require('fs');
const { resolve } = require('path');

// eslint-disable-next-line no-multi-assign
module.exports = exports = {};

exports.scanForComponents = function scanForComponents(path) {
  return readdirSync(resolve(path), { withFileTypes: true })
    .filter((dirent) => dirent.isFile() && /.js$/.test(dirent.name) && /^[A-Z]/.test(dirent.name[0]))
    .map((dirent) => {
      return resolve(path, dirent.name);
    });
};
