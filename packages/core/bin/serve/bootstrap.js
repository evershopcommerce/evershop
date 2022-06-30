const { existsSync } = require('fs');
const path = require('path');

module.exports = exports = {};

exports.loadBootstrapScripts = function (modules) {

  // TODO: Load the thirdparty modules
  modules.forEach((module) => {
    if (existsSync(path.resolve(module.path, 'bootstrap.js'))) {
      require(path.resolve(module.path, 'bootstrap.js'));
    }
  });
}
