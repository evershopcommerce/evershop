import config from 'config';

/**
 * Get the configuration value base on path
 *
 * @param   {string}  path          Path of the configuration
 * @param   {any}  defaultValue     The default value in case the path is not existed
 *
 * @return  {any}                   The configuration value
 */
export function getConfig(path, defaultValue) {
  return config.has(path) ? config.get(path) : defaultValue;
}
