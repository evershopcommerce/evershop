const { components } = require('./components');

// eslint-disable-next-line no-multi-assign
module.exports = exports = {};

exports.getComponentsByRoute = function getComponentsByRoute(routeId) {
  if (components.site[routeId]) {
    return components.site[routeId];
  } else if (components.admin[routeId]) {
    return components.admin[routeId];
  } else {
    return null;
  }
};
