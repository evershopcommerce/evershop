/* eslint-disable no-multi-assign */
/* eslint-disable global-require */
module.exports = exports = function getComponentsLoader() {
  const options = this.getOptions();
  return `module.exports = exports={};exports.getComponents = function getComponents() {let components = require("${options.componentsPath.replace(/\\/g, "\\\\")}");return components;}`;
};
