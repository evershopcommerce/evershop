/* eslint-disable no-param-reassign */
/**
 * This function take 2 objects: target and source, and merge them together recursively
 * This function will not merge built-in objects like Date, RegExp, Map, Set
 * This function will overwrite the value from the first object by the value from the second object if they have the same key and the value is primitive
 * This function will merge array property from 2 objects
 *
 * @param   {object}  target  The target object
 * @param   {object}  source  The source object
 *
 * @return  {object}  The new target object
 */
function merge(target, source, maxDepth = 20, currentDepth = 0) {
  function isBuiltInObject(obj) {
    return (
      obj instanceof Date ||
      obj instanceof RegExp ||
      obj instanceof Map ||
      obj instanceof Set
    );
  }

  if (isBuiltInObject(target) || isBuiltInObject(source)) {
    throw new Error(
      'deepMerge cannot merge built-in objects like Date or RegExp'
    );
  }

  if (
    typeof target !== 'object' ||
    target === null ||
    typeof source !== 'object' ||
    source === null
  ) {
    throw new Error('merge function can only merge plain objects');
  }

  if (currentDepth > maxDepth) {
    throw new Error(`Maximum depth of ${maxDepth} exceeded`);
  }

  function getAllKeys(obj) {
    let keys = [];
    Object.getOwnPropertyNames(obj).forEach((key) => {
      if (!keys.includes(key)) {
        keys.push(key);
      }
    });
    keys = keys.concat(Object.getOwnPropertySymbols(obj));
    return keys;
  }

  getAllKeys(source).forEach((key) => {
    if (key in target) {
      if (Array.isArray(target[key]) && Array.isArray(source[key])) {
        target[key] = Array.from(new Set([...target[key], ...source[key]]));
      } else if (
        typeof target[key] === 'object' &&
        typeof source[key] === 'object'
      ) {
        if (isBuiltInObject(target[key]) || isBuiltInObject(source[key])) {
          target[key] = source[key];
        } else {
          merge(target[key], source[key], maxDepth, currentDepth + 1);
        }
      } else {
        target[key] = source[key];
      }
    } else {
      Object.defineProperty(
        target,
        key,
        Object.getOwnPropertyDescriptor(source, key)
      );
    }
  });

  return target;
}

// eslint-disable-next-line no-multi-assign
module.exports = exports = { merge };
