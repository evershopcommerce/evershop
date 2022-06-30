/* eslint-disable no-underscore-dangle */
/* eslint-disable no-param-reassign */
/* eslint-disable global-require */
const path = require('path');
const http = require('http');
const debug = require('debug')('express:server');
const { red, green } = require('kleur');
const ora = require('ora');
const boxen = require('boxen');
const { app } = require('./app');
const { getModuleMiddlewares, getAllSortedMiddlewares } = require('../../src/lib/middleware');
const { getRoutes } = require('../../src/lib/router/routes');
const { loadBootstrapScripts } = require('./bootstrap');
const { loadModules } = require('./loadModules');
const { addDefaultMiddlewareFuncs } = require('./addDefaultMiddlewareFuncs');
const { loadModuleRoutes } = require('./loadModuleRoutes');
const { loadModuleComponents } = require('./loadModuleComponents');
const { prepare } = require('./prepare');

const spinner = ora({
  text: green('EverShop is starting'),
  spinner: 'dots12'
}).start();
spinner.start();

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
    spinner.fail(`${red(e.stack)}\n`);
    process.exit(0);
  }
});

modules.forEach((module) => {
  try {
    // Load components
    loadModuleComponents(module.path);
  } catch (e) {
    spinner.fail(`${red(e.stack)}\n`);
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

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  // eslint-disable-next-line no-shadow
  const port = parseInt(val, 10);

  // eslint-disable-next-line no-restricted-globals
  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Get port from environment and store in Express.
 */

const port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

/**
 * Create HTTP server.
 */

const server = http.createServer(app);

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof port === 'string'
    ? `Pipe ${port}`
    : `Port ${port}`;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      spinner.fail(`${red(`${bind} requires elevated privileges`)}\n`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      spinner.fail(`${red(`${bind} is already in use`)}\n`);
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  spinner.succeed(green('Done!!!\n') + boxen(green(`Your website is running at "http://localhost:${port}"`), {
    title: 'EverShop', titleAlignment: 'center', padding: 1, margin: 1, borderColor: 'green'
  }));
  const addr = server.address();
  const bind = typeof addr === 'string'
    ? `pipe ${addr}`
    : `port ${addr.port}`;
  debug(`Listening on ${bind}`);
}

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);
