/* eslint-disable global-require */
const { readdirSync } = require('fs');
const { resolve } = require('path');

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
  return readdirSync(resolve(path), { withFileTypes: true })
    .filter((dirent) => dirent.isFile() && /.js$/.test(dirent.name))
    .map((dirent) => {
      const { name } = dirent;
      let m;
      if (/^(\[)[a-zA-Z1-9.,]+(\])[a-zA-Z1-9]+.js$/.test(name)) {
        // eslint-disable-next-line no-useless-escape
        const split = name.split(/[\[\]]+/);
        m = {
          id: split[2].substr(0, split[2].indexOf('.')).trim(),
          middleware: require(resolve(path, dirent.name)),
          after: split[1].split(',').filter((a) => a.trim() !== '')
        };
      } else if (/^[a-zA-Z1-9]+(\[)[a-zA-Z1-9,]+(\]).js$/.test(name)) {
        // eslint-disable-next-line no-useless-escape
        const split = name.split(/[\[\]]+/);
        m = {
          id: split[0].trim(),
          middleware: require(resolve(path, dirent.name)),
          before: split[1].split(',').filter((a) => a.trim() !== '')
        };
      } else if (/^(\[)[a-zA-Z1-9,]+(\])[a-zA-Z1-9]+(\[)[a-zA-Z1-9,]+(\]).js$/.test(name)) {
        // eslint-disable-next-line no-useless-escape
        const split = name.split(/[\[\]]+/);
        m = {
          id: split[2].trim(),
          middleware: require(resolve(path, dirent.name)),
          after: split[1].split(',').filter((a) => a.trim() !== ''),
          before: split[3].split(',').filter((a) => a.trim() !== '')
        };
      } else {
        const split = name.split('.');
        m = {
          id: split[0].trim(),
          middleware: require(resolve(path, dirent.name))
        };
      }
      if (m.id !== 'context' && m.id !== 'errorHandler') {
        m.before = !m.before ? (['notification']) : m.before;
        m.after = !m.after ? (['session']) : m.after;
      }

      return m;
    });
};
