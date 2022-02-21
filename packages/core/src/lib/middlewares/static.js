const staticMiddleware = require('serve-static');
const path = require('path');
const { existsSync } = require('fs');
const { CONSTANTS } = require('../helpers');

module.exports = exports = (request, response, next) => {
  let _path;
  if (request.isAdmin === true) {
    _path = path.normalize(request.path.replace('/admin/assets/', ''));
  } else {
    _path = path.normalize(request.path.replace('/assets/', ''));
  }
  if (request.isAdmin === true) {
    request.originalUrl = request.originalUrl.replace('/admin/assets', '');
    request.url = request.url.replace('/admin/assets', '');
  } else {
    request.originalUrl = request.originalUrl.replace('/assets', '');
    request.url = request.url.replace('/assets', '');
  }

  if (existsSync(path.join(CONSTANTS.ROOTPATH, 'src/theme', _path))) {
    staticMiddleware('src/theme')(request, response, next);
  } else if (existsSync(path.join(CONSTANTS.ROOTPATH, 'dist/theme', _path))) {
    staticMiddleware('dist/theme')(request, response, next);
  } else if (existsSync(path.join(CONSTANTS.MEDIAPATH, _path))) {
    staticMiddleware(CONSTANTS.MEDIAPATH)(request, response, next);
  } else if (existsSync(path.join(CONSTANTS.ROOTPATH, '.nodejscart/build', _path))) {
    staticMiddleware(path.join(CONSTANTS.ROOTPATH, '.nodejscart/build'))(request, response, next);
  } else {
    response.status(404).send('Not Found');
  }
  // TODO: Prevent directory listing
};
