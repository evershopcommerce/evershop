const { existsSync } = require('fs');
const path = require('path');

module.exports = exports = {};

exports.loadBootstrapScript = async function loadBootstrapScript(module) {
  if (existsSync(path.resolve(module.path, 'bootstrap.js'))) {
    /** We expect the bootstrap script to provide a function as a default export */
    await require(path.resolve(module.path, 'bootstrap.js'))();
  }
};
