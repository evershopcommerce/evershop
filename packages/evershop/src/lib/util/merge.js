/* eslint-disable no-param-reassign */
/**
 * This function take 2 objects and merge them into a new object
 *
 * @param   {object}  objectOne  The first object
 * @param   {object}  objectTwo  The second object
 *
 * @return  {object}             The new object
 */
function merge(objectOne, objectTwo) {
  if (typeof objectOne !== 'object' || objectOne === null) {
    throw new Error('`object` must be an object');
  }
  if (typeof objectTwo !== 'object' || objectTwo === null) {
    throw new Error('`object` must be an object');
  }

  const result = Object.create({});

  Object.keys(objectOne).forEach((key) => {
    result[key] = objectOne[key] ? objectOne[key] : objectTwo[key];
    delete objectTwo[key];
  });

  return { ...result, ...objectTwo };
}

// eslint-disable-next-line no-multi-assign
module.exports = exports = { merge };
