/* eslint-disable no-multi-assign */
/* eslint-disable prefer-destructuring */
const { sep } = require('path');

module.exports.getRouteFromPath = (path) => {
  const parts = path.split(sep).reverse();

  // Check if current path is an api path
  if (parts[2] === 'api') {
    return {
      region: 'api',
      scope: parts[1] === 'global' ? 'app' : parts[1],
      routeId: parts[1] === 'global' ? null : parts[1]
    };
  }

  // Current path is a page path
  let scope;
  let routeId;
  let region;
  region = parts[3];
  if (parts[1] === 'global') {
    scope = 'app';
    routeId = null;
    region = parts[2];
  } else if (parts[1] === 'all' && ['frontStore', 'admin'].includes(parts[2])) {
    scope = routeId = parts[2];
  } else if (
    /^[A-Za-z+.]+$/.test(parts[1]) &&
    ['frontStore', 'admin'].includes(parts[2])
  ) {
    scope = parts[2];
    const routes = parts[1].split('+');
    if (routes.length > 1) {
      routeId = routes.filter((r) => r !== '');
    } else {
      routeId = parts[1];
    }
  } else {
    throw new Error(`Path ${path} is not valid for a route`);
  }

  return {
    region,
    scope,
    routeId
  };
};
