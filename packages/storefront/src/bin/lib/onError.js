import { error } from '../../lib/log/logger.js';
import { normalizePort } from './normalizePort.js';

const port = normalizePort();
/**
 * Event listener for HTTP server "err" event.
 */
export function onError(err) {
  if (err.syscall !== 'listen') {
    throw err;
  }

  const bind = typeof port === 'string' ? `Pipe ${port}` : `Port ${port}`;

  // handle specific listen errors with friendly messages
  switch (err.code) {
    case 'EACCES':
      error(`${bind} requires elevated privileges\n`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      error(`${bind} is already in use\n`);
      process.exit(1);
      break;
    default:
      throw err;
  }
}
