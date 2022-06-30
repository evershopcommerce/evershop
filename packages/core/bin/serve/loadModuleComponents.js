const path = require('path');
const { existsSync } = require('fs');
const { addComponents } = require('../../src/lib/componee/addComponents');

module.exports = exports = {};

exports.loadModuleComponents = function loadModuleComponents(modulePath) {
  // Check for routes
  if (existsSync(path.resolve(modulePath, 'views/site/components.js'))) {
    const components = require(path.resolve(modulePath, 'views/site/components.js'));
    if (typeof components === 'object' && components !== null) {
      addComponents('site', components);
    }
  }
  if (existsSync(path.resolve(modulePath, 'views/admin/components.js'))) {
    const components = require(path.resolve(modulePath, 'views/admin/components.js'));
    if (typeof components === 'object' && components !== null) {
      addComponents('admin', components);
    }
  }
}