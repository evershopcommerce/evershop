/**
 * Get the value base on the path
 *
 * @param   {object}  obj           The Data object
 * @param   {string}  path          The path of the property "a.b.c"
 * @param   {any}  defaultValue     The default value in case the path is not existed
 *
 * @return  {any}                   The value
 */
function get(obj, path, defaultValue) {
  const pathSplit = path.split('.');
  let current = obj;
  while (pathSplit.length) {
    if (typeof current !== 'object' || current === null) {
      return defaultValue;
    }
    const key = pathSplit.shift();
    if (current[key] === undefined || current[key] === null) {
      return defaultValue;
    }
    current = current[key];
  }
  return current;
}

// eslint-disable-next-line no-multi-assign
module.exports = exports = { get };
