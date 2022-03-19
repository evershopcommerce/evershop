const { webpack } = require('webpack');
const { createConfig } = require('./configProvider');

// eslint-disable-next-line no-multi-assign
module.exports = exports = {};

exports.createWebpack = function createWebpack(scopePath) {
  return webpack(createConfig(scopePath));
};
