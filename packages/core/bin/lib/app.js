/* eslint-disable no-underscore-dangle */
/* eslint-disable no-param-reassign */
/* eslint-disable global-require */
const path = require('path');
const express = require('express');
const http = require('http');
const debug = require('debug')('express:server');
const { red, green } = require('kleur');
const boxen = require('boxen');
const { getModuleMiddlewares, getAllSortedMiddlewares } = require('../../src/lib/middleware');
const { getRoutes } = require('../../src/lib/router/Router');
const { loadBootstrapScripts } = require('./bootstrap');
const { loadModules } = require('./loadModules');
const { addDefaultMiddlewareFuncs } = require('./addDefaultMiddlewareFuncs');
const { loadModuleRoutes } = require('./loadModuleRoutes');
const { prepare } = require('./prepare');
const { Componee } = require('../../src/lib/componee/Componee');
const { Handler } = require('../../src/lib/middleware/Handler');

module.exports.createApp = () => {
  /** Create express app */
  const app = express();

  /* Loading modules and initilize routes, components and services */
  const modules = loadModules(path.resolve(__dirname, '../../src', 'modules'));

  // Load routes and middleware functions
  modules.forEach((module) => {
    try {
      // Load middleware functions
      getModuleMiddlewares(module.path);
      // Load routes
      loadModuleRoutes(module.path);
    } catch (e) {
      console.log(e);
      process.exit(0);
    }
  });

  modules.forEach((module) => {
    try {
      // Load components
      Componee.loadModuleComponents(module.path);
    } catch (e) {
      console.log(e);
      process.exit(0);
    }
  });
  // TODO: load plugins (extensions), themes

  const routes = getRoutes();

  // Adding default middlewares
  addDefaultMiddlewareFuncs(app, routes);

  /** Hack for 'no route' case*/
  // routes.push({
  //   id: 'noRoute',
  //   path: '/*'
  // });
  routes.forEach((route) => {
    app.use(route.path, Handler.middleware());
  })

  /** Load bootstrap script from modules */
  loadBootstrapScripts(modules);

  return app;
};