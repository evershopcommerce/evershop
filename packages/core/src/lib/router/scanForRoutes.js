const { readdirSync, existsSync, readFileSync } = require('fs');
const path = require('path');
const { registerAdminRoute } = require('./registerAdminRoute');
const { registerSiteRoute } = require('./registerSiteRoute');

// eslint-disable-next-line no-multi-assign
module.exports = exports = {};

/**
 * Scan for routes base on module path.
 */

exports.scanForRoutes = (modulePath, isAdmin, isApi) => {
  const scanedRoutes = readdirSync(modulePath, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);
  scanedRoutes.forEach((r) => {
    if (/^[A-Za-z.]+$/.test(r) === true) {
      if (existsSync(path.join(modulePath, r, 'route'))) {
        let lines = readFileSync(path.join(modulePath, r, 'route'), 'utf-8');
        lines = lines.split(/\r?\n/).map((p) => p.replace('\\\\', '\\'));
        let p = lines[1];
        if (isApi === true) {
          p = `/v1${p}`;
        }
        if (isAdmin === true) {
          registerAdminRoute(r, lines[0].split(',').map((e) => e.trim()).filter((e) => e !== ''), p, isApi);
        } else {
          registerSiteRoute(r, lines[0].split(',').map((e) => e.trim()).filter((e) => e !== ''), p, isApi);
        }
      }
    }
  });
};
