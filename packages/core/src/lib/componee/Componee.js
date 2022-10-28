const { existsSync } = require('fs');
const path = require('path');
const { getEnabledExtensions } = require('../../../bin/extension');
const { getCoreModules } = require('../../../bin/lib/loadModules');
const { getAdminRoutes, getFrontStoreRoutes } = require('../router/Router');
const { assign } = require('../util/assign');
const isDevelopmentMode = require('../util/isDevelopmentMode');
const { scanForComponents } = require('./scanForComponents');

class Componee {
  static components = {
    frontStore: {},
    admin: {}
  }

  static currentScope;
  static currentModule;

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
    const routes = scope === 'admin' ? getAdminRoutes() : getFrontStoreRoutes();
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

  static loadModuleComponents(module) {
    const modulePath = module.path;
    this.currentModule = module.name;
    this.componentsByModule[modulePath] = {};
    if (existsSync(path.resolve(modulePath, 'views/frontStore/components.js'))) {
      this.currentScope = 'frontStore';
      const components = require(path.resolve(modulePath, 'views/frontStore/components.js'));
      if (typeof components === 'object' && components !== null) {
        this.addComponents(this.currentScope, components);
        if (isDevelopmentMode()) {
          this.componentsByModule[modulePath][this.currentScope] = components;
        }
      }
    }
    if (existsSync(path.resolve(modulePath, 'views/admin/components.js'))) {
      this.currentScope = 'admin';
      const components = require(path.resolve(modulePath, 'views/admin/components.js'));
      if (typeof components === 'object' && components !== null) {
        this.addComponents(this.currentScope, components);
        if (isDevelopmentMode()) {
          this.componentsByModule[modulePath][this.currentScope] = components;
        }
      }
    }
  }

  static loadComponentsByRoute(route) {
    let components = [];
    const modules = [...getCoreModules(), ...getEnabledExtensions()];
    modules.forEach((module) => {
      const pagePath = route.isAdmin ?
        path.resolve(module.path, 'pages/admin', route.id) :
        path.resolve(module.path, 'pages/frontStore', route.id);

      components = [...components, ...scanForComponents(pagePath)];
    });

    return components;
  }

  static getComponentsByRoute(routeId) {
    if (this.components.frontStore[routeId]) {
      return this.components.frontStore[routeId];
    } else if (this.components.admin[routeId]) {
      return this.components.admin[routeId];
    } else {
      return null;
    }
  };

  static rebuild() {
    this.components = {
      frontStore: {},
      admin: {}
    };

    Object.keys(this.componentsByModule).forEach((modulePath) => {
      const siteComponents = this.componentsByModule[modulePath]['frontStore'] || {};
      const adminComponents = this.componentsByModule[modulePath]['admin'] || {};
      this.addComponents('frontStore', siteComponents);
      this.addComponents('admin', adminComponents);
    });
  }

  static updateModuleComponents(module) {
    const modulePath = module.path;
    if (existsSync(path.resolve(modulePath, 'views/frontStore/components.js'))) {
      delete require.cache[path.resolve(modulePath, 'views/frontStore/components.js')];
    }
    if (existsSync(path.resolve(modulePath, 'views/admin/components.js'))) {
      delete require.cache[path.resolve(modulePath, 'views/admin/components.js')];
    }
    this.loadModuleComponents(module);
    this.rebuild();
  }
}

module.exports = exports;
exports.Componee = Componee;