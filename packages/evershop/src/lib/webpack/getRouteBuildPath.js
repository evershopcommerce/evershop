const path = require('path');
const { CONSTANTS } = require('../helpers');
const { getRouteBuildSubPath } = require('./getRouteBuildSubPath');

module.exports.getRouteBuildPath = function getRouteBuildPath(route) {
  const subPath = getRouteBuildSubPath(route);
  return path.resolve(CONSTANTS.BUILDPATH, subPath);
};
