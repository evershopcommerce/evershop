const config = require('config');

/**
 * Get the configuration value base on path
 *
 * @param   {string}  path          Path of the configuration
 * @param   {any}  defaultValue     The default value in case the path is not existed
 *
 * @return  {any}                   The configuration value
 */
function getConfig(path, defaultValue) {
  return config.has(path) ? config.get(path) : defaultValue;
}

// eslint-disable-next-line no-multi-assign
module.exports = exports = {};
exports.getConfig = getConfig;
