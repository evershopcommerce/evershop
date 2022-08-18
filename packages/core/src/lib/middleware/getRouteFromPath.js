const { sep } = require('path');

module.exports.getRouteFromPath = (path) => {
  const parts = path.split(sep).reverse();
  let scope, routeId;
  if (parts[1] === 'controllers' || parts[1] === 'apiControllers') {
    scope = 'app';
    routeId = null;
  } else if (parts[1] === 'all' && ['site', 'admin'].includes(parts[2])) {
    scope = routeId = parts[2];
  } else if (/^[A-Za-z+.]+$/.test(parts[1]) && ['site', 'admin'].includes(parts[2])) {
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
    scope,
    routeId
  }
}