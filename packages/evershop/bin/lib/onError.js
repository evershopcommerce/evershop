const { red, green } = require('kleur');
const normalizePort = require('./normalizePort');

const port = normalizePort();
/**
 * Event listener for HTTP server "error" event.
 */
module.exports = function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof port === 'string' ? `Pipe ${port}` : `Port ${port}`;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.log(`${red(`${bind} requires elevated privileges`)}\n`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.log(`${red(`${bind} is already in use`)}\n`);
      process.exit(1);
      break;
    default:
      throw error;
  }
};
