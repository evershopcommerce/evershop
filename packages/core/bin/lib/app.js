/* eslint-disable no-underscore-dangle */
/* eslint-disable no-param-reassign */
/* eslint-disable global-require */
const express = require('express');
const { getModuleMiddlewares } = require('../../src/lib/middleware');
const { getRoutes } = require('../../src/lib/router/Router');
const { getCoreModules } = require('./loadModules');
const { addDefaultMiddlewareFuncs } = require('./addDefaultMiddlewareFuncs');
const { loadModuleRoutes } = require('./loadModuleRoutes');
const { Handler } = require('../../src/lib/middleware/Handler');
const { getEnabledExtensions } = require('../extension');

module.exports.createApp = () => {
  /** Create express app */
  const app = express();

  /* Loading modules and initilize routes, components and services */
  const modules = getCoreModules();

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

  /** Load extensions */
  const extensions = getEnabledExtensions();
  extensions.forEach((extension) => {
    try {
      // Load middleware functions
      getModuleMiddlewares(extension.resolve);
      // Load routes
      loadModuleRoutes(extension.resolve);
    } catch (e) {
      console.log(e);
      process.exit(0);
    }
  });

  const routes = getRoutes();

  // Adding default middlewares
  addDefaultMiddlewareFuncs(app, routes);

  routes.forEach((route) => {
    app.all(route.path, Handler.middleware());
  })

  return app;
};