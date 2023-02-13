/* eslint-disable global-require */
const { readdirSync } = require('fs');
const { resolve } = require('path');
const { parseFromFile } = require('./parseFromFile');

// eslint-disable-next-line no-multi-assign
module.exports = exports = {};

/**
 * This function take a path and scan for the middleware functions
 *
 * @param {string} path  The path of the folder where middleware functions are located
 *
 * @return {array}  List of middleware function
 */
exports.scanForMiddlewareFunctions = function scanForMiddlewareFunctions(path) {
  let middlewares = [];
  readdirSync(resolve(path), { withFileTypes: true })
    .filter(
      (dirent) =>
        dirent.isFile() &&
        /.js$/.test(dirent.name) &&
        !/^[A-Z]/.test(dirent.name[0])
    )
    .forEach((dirent) => {
      const middlewareFunc = resolve(path, dirent.name);
      middlewares = middlewares.concat(parseFromFile(middlewareFunc));
    });

  return middlewares;
};
