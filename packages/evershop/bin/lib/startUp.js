const http = require('http');
const { createApp } = require('./app');
const normalizePort = require('./normalizePort');
const onListening = require('./onListening');
const onError = require('./onError');
const { Handler } = require('@evershop/evershop/src/lib/middleware/Handler');
const { getCoreModules } = require('./loadModules');
const { migrate } = require('./bootstrap/migrate');
const { loadBootstrapScript } = require('./bootstrap/bootstrap');
const { getEnabledExtensions } = require('../extension');
const spawn = require('cross-spawn');
const path = require('path');

var app = createApp();
/** Create a http server */
const server = http.createServer(app);

module.exports.start = async function start(cb) {
  const modules = [...getCoreModules(), ...getEnabledExtensions()];

  /** Migration */
  try {
    for (const module of modules) {
      await migrate(module);
    }
  } catch (e) {
    console.log(e);
    process.exit(0);
  }

  /** Loading bootstrap script from modules */
  try {
    for (const module of modules) {
      await loadBootstrapScript(module);
    }
  } catch (e) {
    console.log(e);
    process.exit(0);
  }
  process.env.ALLOW_CONFIG_MUTATIONS = false;
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

  // Spawn the child process to manage events
  const child = spawn(
    'node',
    [path.resolve(__dirname, '../../src/lib/event/event-manager.js')],
    {
      stdio: 'inherit'
    }
  );
  child.on('error', (err) => {
    console.error(`Error spawning event processor: ${err}`);
  });
  child.unref();
};

module.exports.updateApp = function updateApp(cb) {
  /** Clean up middleware */
  Handler.middlewares = [];
  var newApp = createApp();
  server.removeListener('request', app);
  server.on('request', newApp);
  app = newApp;
  cb();
};
