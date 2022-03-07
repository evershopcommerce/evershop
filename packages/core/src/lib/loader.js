/* eslint-disable global-require */
export default function getComponentsLoader() {
  const options = this.getOptions();

  return `module.exports = exports={};exports.getComponents = function getComponents() {let components = require("${options.componentsPath}");console.log(components); return components;}`;
}
