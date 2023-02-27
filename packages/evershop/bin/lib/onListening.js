const boxen = require('boxen');
const { red, green } = require('kleur');
const isDevelopmentMode = require('@evershop/evershop/src/lib/util/isDevelopmentMode');
const normalizePort = require('./normalizePort');
const port = normalizePort();
/**
 * Event listener for HTTP server "listening" event.
 */
module.exports = function onListening(server) {
  console.log(
    boxen(green(`Your website is running at "http://localhost:${port}"`), {
      title: 'EverShop',
      titleAlignment: 'center',
      padding: 1,
      margin: 1,
      borderColor: 'green'
    })
  );

  // const addr = server.address();
  // const bind = typeof addr === 'string'
  //   ? `pipe ${addr}`
  //   : `port ${addr.port}`;
  // debug(`Listening on ${bind}`);
};
