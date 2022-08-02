const { existsSync } = require('fs');
const path = require('path');
const { getAdminRoutes, getSiteRoutes } = require('../router/routes');
const { assign } = require('../util/assign');
const isDevelopmentMode = require('../util/isDevelopmentMode');

class Componee {
  static components = {
    site: {},
    admin: {}
  }

  static componentsByModule = {}

  static addComponent(scope, route, id, areaId, source, props, sortOrder) {
    const data = {
      [scope]: {
        [route]: {
          [areaId]: {
            [id]: {
              id,
              source,
              props,
              sortOrder
            }
          }
        }
      }
    };
    assign(this.components, data);
  }

  static addComponents(scope, componentObjects) {
    const routes = scope === 'admin' ? getAdminRoutes() : getSiteRoutes();
    Object.keys(componentObjects).forEach((key) => {
      if (!Array.isArray(componentObjects[key])) {
        throw new TypeError(`Component list under ${key} must be an array.`);
      }
      if (key === '*') {
        routes.forEach((route) => {
          if (route.method.length === 1 && route.method[0] === 'GET') {
            componentObjects[key].forEach((c) => {
              this.addComponent(scope, route.id, c.id, c.areaId, c.source, c.props, c.sortOrder);
            });
          }
        });
      } else if (/^\*-([a-zA-Z,])+/g.test(key)) {
        const excepts = key.split('-')[1].split(',');
        routes.forEach((route) => {
          if (route.method.length === 1 && route.method[0] === 'GET' && !excepts.includes(route.id)) {
            componentObjects[key].forEach((c) => {
              this.addComponent(scope, route.id, c.id, c.areaId, c.source, c.props, c.sortOrder);
            });
          }
        });
        // eslint-disable-next-line no-useless-escape
      } else if (/([a-zA-Z\+])/.test(key)) {
        const list = key.split('+');
        routes.forEach((route) => {
          if (route.method.length === 1 && route.method[0] === 'GET' && list.includes(route.id)) {
            componentObjects[key].forEach((c) => {
              this.addComponent(scope, route.id, c.id, c.areaId, c.source, c.props, c.sortOrder);
            });
          }
        });
      }
    });
  }

  static loadModuleComponents(modulePath) {
    this.componentsByModule[modulePath] = {};
    // Check for routes
    if (existsSync(path.resolve(modulePath, 'views/site/components.js'))) {
      const components = require(path.resolve(modulePath, 'views/site/components.js'));
      if (typeof components === 'object' && components !== null) {
        this.addComponents('site', components);
        if (isDevelopmentMode()) {
          this.componentsByModule[modulePath]['site'] = components;
        }
      }
    }
    if (existsSync(path.resolve(modulePath, 'views/admin/components.js'))) {
      const components = require(path.resolve(modulePath, 'views/admin/components.js'));
      if (typeof components === 'object' && components !== null) {
        this.addComponents('admin', components);
        if (isDevelopmentMode()) {
          this.componentsByModule[modulePath]['admin'] = components;
        }
      }
    }
  }

  static getComponentsByRoute(routeId) {
    if (this.components.site[routeId]) {
      return this.components.site[routeId];
    } else if (this.components.admin[routeId]) {
      return this.components.admin[routeId];
    } else {
      return null;
    }
  };

  static rebuild() {
    this.components = {
      site: {},
      admin: {}
    };

    Object.keys(this.componentsByModule).forEach((modulePath) => {
      const siteComponents = this.componentsByModule[modulePath]['site'] || {};
      const adminComponents = this.componentsByModule[modulePath]['admin'] || {};
      this.addComponents('site', siteComponents);
      this.addComponents('admin', adminComponents);
    });
  }

  static updateModuleComponents(modulePath) {
    this.componentsByModule[modulePath] = {};
    if (existsSync(path.resolve(modulePath, 'views/site/components.js'))) {
      delete require.cache[path.resolve(modulePath, 'views/site/components.js')];
      const components = require(path.resolve(modulePath, 'views/site/components.js'));
      if (typeof components === 'object' && components !== null) {
        this.componentsByModule[modulePath]['site'] = components;
      }
    }
    if (existsSync(path.resolve(modulePath, 'views/admin/components.js'))) {
      delete require.cache[path.resolve(modulePath, 'views/admin/components.js')];
      const components = require(path.resolve(modulePath, 'views/admin/components.js'));
      if (typeof components === 'object' && components !== null) {
        this.componentsByModule[modulePath]['admin'] = components;
      }
    }
    this.rebuild();
  }
}

module.exports = exports;
exports.Componee = Componee;