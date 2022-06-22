const { readdirSync, existsSync } = require('fs');
const path = require('path');

module.exports = exports = {};

exports.loadBootstrapScripts = function () {
  // Load the core modules
  const modules = readdirSync(path.resolve(__dirname, '../../src', 'modules'), { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  // TODO: Load the thirdparty modules
  modules.forEach((module) => {
    if (existsSync(path.resolve(__dirname, '../../src', 'modules', module, 'bootstrap.js'))) {
      require(path.resolve(__dirname, '../../src', 'modules', module, 'bootstrap.js'));
    }
  });
}
