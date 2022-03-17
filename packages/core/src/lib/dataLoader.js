/* eslint-disable quotes */
/* eslint-disable global-require */
export default function getDataLoader() {
  return `const data = require('../webpack/pageData.json');module.exports = exports={};exports.getPageData = function getPageData(path) {return data[path]}`;
}
