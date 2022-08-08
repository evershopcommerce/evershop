const http = require('http');
const { createApp } = require('./app');
const { red, green } = require('kleur');
const boxen = require('boxen');
const debug = require('debug')('express:server');
const normalizePort = require('./normalizePort');
const onListening = require('./onListening');
const onError = require('./onError');
const { Handler } = require('../../src/lib/middleware/Handler');
const { Componee } = require('../../src/lib/componee/Componee');
const { empty, getRoutes } = require('../../src/lib/router/Router');

var app = createApp();
/** Create a http server */
const server = http.createServer(app);

module.exports.start = (cb) => {
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

module.exports.updateApp = (cb) => {
  /** Clean up middleware */
  Handler.middlewares = [];
  Componee.components = {};
  //empty();
  var newApp = createApp();
  server.removeListener('request', app);
  server.on('request', newApp);
  app = newApp;
  cb();
}