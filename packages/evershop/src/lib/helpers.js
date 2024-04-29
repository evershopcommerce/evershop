const path = require('path');
const { getConfig } = require('./util/getConfig');

const rootPath = process.cwd();

exports.CONSTANTS = Object.freeze({
  ROOTPATH: rootPath,
  LIBPATH: path.resolve(__dirname),
  MOLDULESPATH: path.resolve(__dirname, '..', 'modules'),
  PUBLICPATH: path.resolve(rootPath, 'public'),
  MEDIAPATH: path.resolve(rootPath, 'media'),
  NODEMODULEPATH: path.resolve(rootPath, 'node_modules'),
  THEMEPATH: path.resolve(rootPath, 'themes'),
  CACHEPATH: path.resolve(rootPath, '.evershop'),
  BUILDPATH: path.resolve(rootPath, '.evershop', 'build'),
  ADMIN_COLLECTION_SIZE: getConfig('admin_collection_size', 20)
});
