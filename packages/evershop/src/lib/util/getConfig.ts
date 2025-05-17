import config from 'config';

/**
 * Get the configuration value base on path. Return the default value if the path is not found.
 */
export function getConfig<T>(path: string, defaultValue?: T): T {
  return config.has(path) ? config.get<T>(path) : (defaultValue as T);
}
