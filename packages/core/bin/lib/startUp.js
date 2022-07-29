const http = require('http');
const app = require('./app');
const { red, green } = require('kleur');
const boxen = require('boxen');
const debug = require('debug')('express:server');
const normalizePort = require('./normalizePort');
const onListening = require('./onListening');
const onError = require('./onError');

module.exports = () => {
  /** Create a http server */
  const server = http.createServer(app)

  /**
   * Get port from environment and store in Express.
   */
  const port = normalizePort(process.env.PORT || '3000');
  app.set('port', port);

  /** Start listening */
  server.on('listening', onListening);
  server.on('error', onError);
  server.listen(port);
}