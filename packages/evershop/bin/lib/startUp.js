const http = require('http');
const { Handler } = require('@evershop/evershop/src/lib/middleware/Handler');
const spawn = require('cross-spawn');
const path = require('path');
const { error } = require('@evershop/evershop/src/lib/log/debuger');
const { createApp } = require('./app');
const normalizePort = require('./normalizePort');
const onListening = require('./onListening');
const onError = require('./onError');
const { getCoreModules } = require('./loadModules');
const { migrate } = require('./bootstrap/migrate');
const { loadBootstrapScript } = require('./bootstrap/bootstrap');
const { getEnabledExtensions } = require('../extension');

let app = createApp();
/** Create a http server */
const server = http.createServer(app);

module.exports.start = async function start(cb) {
  const modules = [...getCoreModules(), ...getEnabledExtensions()];

  /** Migration */
  try {
    // eslint-disable-next-line no-restricted-syntax
    for (const module of modules) {
      await migrate(module);
    }
  } catch (e) {
    error(e);
    process.exit(0);
  }

  /** Loading bootstrap script from modules */
  try {
    // eslint-disable-next-line no-restricted-syntax
    for (const module of modules) {
      await loadBootstrapScript(module);
    }
  } catch (e) {
    error(e);
    process.exit(0);
  }
  process.env.ALLOW_CONFIG_MUTATIONS = false;
  /**
   * Get port from environment and store in Express.
   */
  const port = normalizePort(process.env.PORT || '3000');
  app.set('port', port);

  /** Start listening */
  server.on('listening', () => {
    onListening();
    if (cb) {
      cb();
    }
  });
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
    error(`Error spawning event processor: ${err}`);
  });
  child.unref();
};

module.exports.updateApp = function updateApp(cb) {
  /** Clean up middleware */
  Handler.middlewares = [];
  const newApp = createApp();
  server.removeListener('request', app);
  server.on('request', newApp);
  app = newApp;
  cb();
};
