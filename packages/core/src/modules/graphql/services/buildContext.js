const { pool } = require("../../../lib/mysql/connection");
const { get } = require("../../../lib/util/get");

const context = Object.create({});

context.pool = pool;

module.exports.getContextValue = function getContextValue(key, defaultValue = undefined) {
  return get(context, key, defaultValue);
}

module.exports.setContextValue = function setContextValue(key, value) {
  context[key] = value; // We just overwrite the value if it already exists
}

module.exports.context = context;