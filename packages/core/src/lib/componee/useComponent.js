const { existsSync } = require('fs');
const { resolve } = require('path');

// eslint-disable-next-line no-multi-assign
module.exports = exports = {};

exports.useComponent = function useComponent(path) {
  if (existsSync(resolve(__dirname, '../components', path))) {
    return resolve(__dirname, '../components', path);
  } else {
    throw new Error(`Component ${path} does not exist`);
  }
};
