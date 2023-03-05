const { resolve } = require('path');
const { CONSTANTS } = require('@evershop/evershop/src/lib/helpers');
const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');
const {
  INVALID_PAYLOAD,
  OK
} = require('@evershop/evershop/src/lib/util/httpStatus');

// eslint-disable-next-line no-unused-vars
module.exports = (request, response, delegate, next) => {
  if (!request.files || request.files.length === 0) {
    response.status(INVALID_PAYLOAD).json({
      error: {
        status: INVALID_PAYLOAD,
        message: 'No image was provided'
      }
    });
  } else {
    response.status(OK).json({
      data: {
        files: request.files.map((f) => ({
          name: f.filename,
          type: f.minetype,
          size: f.size,
          path: f.path
            .replace(resolve(CONSTANTS.MEDIAPATH), '')
            .split('\\')
            .join('/'),
          url: buildUrl('staticAsset', [
            f.path
              .replace(resolve(CONSTANTS.MEDIAPATH), '')
              .split('\\')
              .join('/')
          ])
        }))
      }
    });
  }
};
