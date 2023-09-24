const open = require('open');
const boxen = require('boxen');
const { success } = require('@evershop/evershop/src/lib/log/debuger');
const normalizePort = require('./normalizePort');
const {
  aRandomToken
} = require('@evershop/evershop/src/modules/auth/services/aRandomToken');
const port = normalizePort();

/**
 * Event listener for HTTP server "listening" event.
 */
module.exports = function onListening() {
  success(
    boxen(`Your website is running at "http://localhost:${port}"`, {
      title: 'EverShop',
      titleAlignment: 'center',
      padding: 1,
      margin: 1,
      borderColor: 'green'
    })
  );
  // Automatically open the browser if '--no-open' is specified
  if (!process.argv.includes('--no-open')) {
    open(`http://localhost:${port}/welcome-user/${aRandomToken}`);
  }
};
