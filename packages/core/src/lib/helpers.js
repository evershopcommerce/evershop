const path = require('path');

// eslint-disable-next-line no-multi-assign
const helpers = module.exports = exports = {};

const rootPath = process.cwd();
helpers.CONSTANTS = Object.freeze({
  ROOTPATH: rootPath,
  LIBPATH: path.resolve(__dirname),
  MOLDULESPATH: path.resolve(__dirname, '..', 'modules'),
  PUBLICPATH: path.resolve(rootPath, 'public'),
  MEDIAPATH: path.resolve(rootPath, 'media'),
  NODEMODULEPATH: path.resolve(rootPath, 'node_modules'),
  THEMEPATH: path.resolve(rootPath, 'themes'),
  CACHEPATH: path.resolve(rootPath, '.evershop'),
  BUILDPATH: path.resolve(rootPath, '.evershop', 'build')
});
