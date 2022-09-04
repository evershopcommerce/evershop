const { get } = require("./get");

/** Can use middleware to add context value */
const context = {};

module.exports.getContextValue = function getContextValue(key, defaultValue = undefined) {
  return get(context, key, defaultValue);
}

module.exports.setContextValue = function setContextValue(key, value) {
  context[key] = value; // We just overwrite the value if it already exists
}