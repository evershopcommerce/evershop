/**
 * Normalize a port into a number, string, or false.
 */
module.exports = function normalizePort() {
  // eslint-disable-next-line no-shadow
  const port = parseInt(process.env.PORT, 10);

  // eslint-disable-next-line no-restricted-globals
  if (isNaN(port)) {
    return 3000;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return 3000;
};
