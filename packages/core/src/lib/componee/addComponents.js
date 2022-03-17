const { getAdminRoutes, getSiteRoutes } = require('../router/routes');
const { addComponent } = require('./addComponent');

// eslint-disable-next-line no-multi-assign
module.exports = exports = {};

exports.addComponents = function addComponents(scope, componentObjects) {
  const routes = scope === 'admin' ? getAdminRoutes() : getSiteRoutes();
  Object.keys(componentObjects).forEach((key) => {
    if (!Array.isArray(componentObjects[key])) {
      throw new TypeError(`Component list under ${key} must be an array.`);
    }
    if (key === '*') {
      routes.forEach((route) => {
        if (route.method.length === 1 && route.method[0] === 'GET') {
          componentObjects[key].forEach((c) => {
            addComponent(scope, route.id, c.id, c.areaId, c.source, c.props, c.sortOrder);
          });
        }
      });
    } else if (/^\*-([a-zA-Z,])+/g.test(key)) {
      const excepts = key.split('-')[1].split(',');
      routes.forEach((route) => {
        if (route.method.length === 1 && route.method[0] === 'GET' && !excepts.includes(route.id)) {
          componentObjects[key].forEach((c) => {
            addComponent(scope, route.id, c.id, c.areaId, c.source, c.props, c.sortOrder);
          });
        }
      });
      // eslint-disable-next-line no-useless-escape
    } else if (/([a-zA-Z\+])/.test(key)) {
      const list = key.split('+');
      routes.forEach((route) => {
        if (route.method.length === 1 && route.method[0] === 'GET' && list.includes(route.id)) {
          componentObjects[key].forEach((c) => {
            addComponent(scope, route.id, c.id, c.areaId, c.source, c.props, c.sortOrder);
          });
        }
      });
    }
  });
};
