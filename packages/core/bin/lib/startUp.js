const http = require('http');
const { createApp } = require('./app');
const normalizePort = require('./normalizePort');
const onListening = require('./onListening');
const onError = require('./onError');
const { Handler } = require('../../src/lib/middleware/Handler');
const { Componee } = require('../../src/lib/componee/Componee');
const { getCoreModules } = require('./loadModules');
const { migrate } = require('./bootstrap/migrate');
const { loadBootstrapScript } = require('./bootstrap/bootstrap');
const { getEnabledPlugins } = require('../plugin');
const isDevelopmentMode = require('../../src/lib/util/isDevelopmentMode');
const { getRoutes } = require('../../src/lib/router/Router');
const { createComponents } = require('./createComponents');
const { isBuildRequired } = require('../../src/lib/webpack/isBuildRequired');

var app = createApp();
/** Create a http server */
const server = http.createServer(app);

module.exports.start = async function start(cb) {
  const modules = [...getCoreModules(), ...getEnabledPlugins()];
  /** Loading front-end components */
  modules.forEach((module) => {
    try {
      // Load components
      Componee.loadModuleComponents(module);
    } catch (e) {
      console.log(e);
      process.exit(0);
    }
  });

  /** Build the components */
  if (isDevelopmentMode()) {
    const routes = getRoutes();
    await createComponents(routes.filter((r) => isBuildRequired(r)), true);
  }

  /** Migration */
  try {
    for (const module of modules) {
      await migrate(module);
    };
  } catch (e) {
    console.log(e);
    process.exit(0);
  }

  /** Loading bootstrap script from modules */
  try {
    for (const module of modules) {
      await loadBootstrapScript(module);
    };
  } catch (e) {
    console.log(e);
    process.exit(0);
  }

  /**
   * Get port from environment and store in Express.
   */
  const port = normalizePort(process.env.PORT || '3000');
  app.set('port', port);

  /** Start listening */
  server.on('listening', onListening);
  cb ? server.on('listening', cb) : null;
  server.on('error', onError);
  server.listen(port);
}

module.exports.updateApp = function updateApp(cb) {
  /** Clean up middleware */
  Handler.middlewares = [];
  var newApp = createApp();
  server.removeListener('request', app);
  server.on('request', newApp);
  app = newApp;
  cb();
}