// eslint-disable-next-line import/no-extraneous-dependencies
const staticMiddleware = require('serve-static');
const { normalize, join } = require('path');
const { existsSync } = require('fs');
const { CONSTANTS } = require('../helpers');

// eslint-disable-next-line no-multi-assign
module.exports = exports = (request, response, next) => {
  let path;
  if (request.isAdmin === true) {
    path = normalize(request.originalUrl.replace('/admin/assets/', ''));
  } else {
    path = normalize(request.originalUrl.replace('/assets/', ''));
  }
  if (request.isAdmin === true) {
    request.originalUrl = request.originalUrl.replace('/admin/assets', '');
    request.url = request.originalUrl.replace('/admin/assets', '');
  } else {
    request.originalUrl = request.originalUrl.replace('/assets', '');
    request.url = request.originalUrl.replace('/assets', '');
  }

  if (path.endsWith('/')) {
    response.status(404).send('Not Found');
  } else if (existsSync(join(CONSTANTS.ROOTPATH, '.evershop/build', path))) {
    staticMiddleware(join(CONSTANTS.ROOTPATH, '.evershop/build'))(
      request,
      response,
      next
    );
  } else if (existsSync(join(CONSTANTS.MEDIAPATH, path))) {
    staticMiddleware(CONSTANTS.MEDIAPATH)(request, response, next);
  } else if (existsSync(join(CONSTANTS.ROOTPATH, 'public', path))) {
    staticMiddleware(join(CONSTANTS.ROOTPATH, 'public'))(
      request,
      response,
      next
    );
  } else {
    response.status(404).send('Not Found');
  }
  // TODO: Prevent directory listing
};
