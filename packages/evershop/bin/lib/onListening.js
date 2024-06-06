const boxen = require('boxen');
const { green } = require('kleur');
const normalizePort = require('./normalizePort');

const port = normalizePort();
/**
 * Event listener for HTTP server "listening" event.
 */
module.exports = function onListening() {
  const message = boxen(
    `Your website is running at "http://localhost:${port}"`,
    {
      title: 'EverShop',
      titleAlignment: 'center',
      padding: 1,
      margin: 1,
      borderColor: 'green'
    }
  );
  // eslint-disable-next-line no-console
  console.log(green(message));
};
