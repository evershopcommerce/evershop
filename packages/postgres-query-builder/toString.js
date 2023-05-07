module.exports = exports = {};

exports.toString = function toString(value) {
  // Check if value is an array or object
  if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
    // If value is an array, return a string with comma separated values
    return JSON.stringify(value);
  } else {
    return value;
  }
};
