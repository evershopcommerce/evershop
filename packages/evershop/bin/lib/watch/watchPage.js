const touch = require("touch");
const { resolve } = require('path');
const { CONSTANTS } = require("../../../src/lib/helpers");

module.exports.watchPage = function (event, path) {
  if (event === 'add') {
    // TODO: Touching this file will trigger a rebuild of all pages. This is not optimized
    touch(resolve(CONSTANTS.LIBPATH, 'components/react/client/Index.js'));
  }
}