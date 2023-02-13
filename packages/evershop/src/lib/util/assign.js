/* eslint-disable no-param-reassign */
/**
 * This function take 2 objects and merge the second one to the first one
 *
 * @param   {object}  object  The main object
 * @param   {object}  data    The object to be merged
 *
 */
function assign(object, data) {
  if (typeof object !== 'object' || object === null) {
    throw new Error('`object` must be an object');
  }

  if (typeof data !== 'object' || data === null) {
    throw new Error('`data` must be an object');
  }

  Object.keys(data).forEach((key) => {
    if (
      data[key] &&
      data[key].constructor === Array &&
      object[key] &&
      object[key].constructor === Array
    ) {
      object[key] = object[key].concat(data[key]);
    } else if (
      typeof object[key] !== 'object' ||
      typeof data[key] !== 'object' ||
      object[key] === null
    ) {
      object[key] = data[key];
    } else {
      assign(object[key], data[key]);
    }
  });
}

// eslint-disable-next-line no-multi-assign
module.exports = exports = { assign };
