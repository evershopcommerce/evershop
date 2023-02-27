const { join, basename } = require('path');
const { existsSync, mkdirSync } = require('fs');
const { CONSTANTS } = require('@evershop/evershop/src/lib/helpers');
const {
  INVALID_PAYLOAD,
  OK
} = require('@evershop/evershop/src/lib/util/httpStatus');

// eslint-disable-next-line no-unused-vars
module.exports = (request, response, delegate, next) => {
  const { path } = request.body;
  if (existsSync(join(CONSTANTS.MEDIAPATH, path))) {
    response.status(INVALID_PAYLOAD).json({
      error: {
        status: INVALID_PAYLOAD,
        message: 'Folder already existed'
      }
    });
  } else {
    mkdirSync(join(CONSTANTS.MEDIAPATH, path), { recursive: true });
    response.status(OK).json({
      data: {
        path,
        name: basename(join(CONSTANTS.MEDIAPATH, path))
      }
    });
  }
};
