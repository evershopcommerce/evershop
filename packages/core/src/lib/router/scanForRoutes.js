const { readdirSync, existsSync, readFileSync } = require('fs');
const { join } = require('path');

// eslint-disable-next-line no-multi-assign
module.exports = exports = {};

function startWith(str, prefix) {
  return str.slice(0, prefix.length) === prefix;
}

function validateRoute(methods, path, routePath) {
  if (methods.length === 0) {
    throw new Error(`Method is required. Please check the route defined at ${routePath}`);
  }
  const check = methods.find((m) => ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].includes(m) === false);
  if (check !== undefined) {
    throw new Error(`Method ${check} is invalid. Please check the route defined at ${routePath}`);
  }
  if (startWith(path, '/') === false) {
    throw new Error(`Path ${path} is invalid. Please check the route defined at ${routePath}`);
  }

  return true;
}

/**
 * Scan for routes base on module path.
 */

exports.scanForRoutes = (path, isAdmin, isApi) => {
  const scanedRoutes = readdirSync(path, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);
  return scanedRoutes.map((r) => {
    if (/^[A-Za-z.]+$/.test(r) === true) {
      if (existsSync(join(path, r, 'route'))) {
        let lines = readFileSync(join(path, r, 'route'), 'utf-8');
        lines = lines.split(/\r?\n/).map((p) => p.replace('\\\\', '\\'));
        const methods = lines[0].split(',').map((m) => m.trim()).filter((m) => m !== '');
        let p = lines[1];
        if (validateRoute(methods, p, join(path, r, 'route')) === true) {
          if (isApi === true) {
            p = `/v1${p}`;
          }
          return {
            id: r,
            method: methods,
            path: p,
            isAdmin,
            isApi
          };
        } else {
          return false;
        }
      } else {
        return false;
      }
    } else {
      return false;
    }
  }).filter((e) => e !== false);
};
