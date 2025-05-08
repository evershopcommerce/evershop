/**
 * Normalize a port into a number, string, or false.
 */
export function normalizePort() {
  const port = parseInt(process.env.PORT, 10);

  if (isNaN(port)) {
    return 3000;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return 3000;
}
