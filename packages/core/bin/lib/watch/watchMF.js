const { normalize, basename } = require('path');
const { CONSTANTS } = require("../../../src/lib/helpers");
const { Handler } = require('../../../src/lib/middleware/Handler');
const { broadcash } = require('./broadcash');

module.exports.watchMF = function (event, path) {
  console.log('updating middleware', path, normalize('pages/global'))
  // Check if path include graphql/types
  if (!path.includes(normalize('pages/admin')) &&
    !path.includes(normalize('pages/site')) &&
    !path.includes(normalize('pages/global'))
  ) {
    return;
  }

  // Check if the file name is capitalized, then it is not a middleware
  const fileName = basename(path);
  if (fileName[0] !== '[' && fileName[0] === fileName[0].toUpperCase()) {
    return;
  }

  if (event === 'change') {
    delete require.cache[require.resolve(path)];
  }
  if (event === 'unlink') {
    Handler.removeMiddleware(path);
  }
  if (event === 'add') {
    Handler.addMiddlewareFromPath(path);
  }
  console.log('broadcashing')
  try {
    broadcash();
  } catch (e) {
    console.log(red(`Hot Reload Error: ${e.message}`));
  }
}