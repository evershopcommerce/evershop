/* eslint-disable no-underscore-dangle */
/* eslint-disable no-param-reassign */
/* eslint-disable global-require */
const path = require('path');
const http = require('http');
const { addDefaultMiddlewareFuncs } = require('../../../../../bin/serve/addDefaultMiddlewareFuncs');
const { app } = require('../../../../../bin/serve/app');
const { loadBootstrapScripts } = require('../../../../../bin/serve/bootstrap');
const { loadModuleComponents } = require('../../../../../bin/serve/loadModuleComponents');
const { loadModuleRoutes } = require('../../../../../bin/serve/loadModuleRoutes');
const { prepare } = require('../../../../../bin/serve/prepare');
const { getModuleMiddlewares, getAllSortedMiddlewares } = require('../..');
const { getRoutes } = require('../../../router/routes');
const { once } = require('events');

/* Loading modules and initilize routes, components and services */
const modules = [
  {
    name: 'cmscopy',
    path: path.resolve(__dirname, './modules/cmscopy')
  },
  {
    name: '404page',
    path: path.resolve(__dirname, './modules/404page')
  },
  {
    name: 'error',
    path: path.resolve(__dirname, './modules/error')
  },
  {
    name: 'delegate',
    path: path.resolve(__dirname, './modules/delegate')
  }
];

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
    loadModuleComponents(module.path);
  } catch (e) {
    console.log(e);
    process.exit(0);
  }
});
// TODO: load plugins (extensions), themes

const routes = getRoutes();

// Adding default middlewares
addDefaultMiddlewareFuncs(app, routes);

const middlewares = getAllSortedMiddlewares();

prepare(app, middlewares, routes);
/** Load bootstrap script from modules */
loadBootstrapScripts(modules);

const server = http.createServer(app);
module.exports = {
  bootstrap: async () => {
    server.listen();
    await once(server, 'listening');
    return server.address().port;
  },
  close: async () => {
    // // Await close the http server
    // await new Promise((resolve) => {
    //   server.close(resolve);
    // })
  }
}


server.listen(0, () => {
  console.log(server.address().port);
});