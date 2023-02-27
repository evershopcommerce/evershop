const { join } = require('path');
const { existsSync, unlinkSync, lstatSync } = require('fs');
const { CONSTANTS } = require('@evershop/evershop/src/lib/helpers');
const {
  INVALID_PAYLOAD,
  OK
} = require('@evershop/evershop/src/lib/util/httpStatus');

// eslint-disable-next-line no-unused-vars
module.exports = (request, response, delegate, next) => {
  const path = request.params[0] || '';
  if (!existsSync(join(CONSTANTS.MEDIAPATH, path))) {
    response.status(INVALID_PAYLOAD).json({
      error: {
        status: INVALID_PAYLOAD,
        message: 'Requested path does not exist'
      }
    });
  } else if (lstatSync(join(CONSTANTS.MEDIAPATH, path)).isDirectory()) {
    response.status(INVALID_PAYLOAD).json({
      error: {
        status: INVALID_PAYLOAD,
        message: 'Requested path is not a file'
      }
    });
  } else {
    unlinkSync(join(CONSTANTS.MEDIAPATH, path));
    response.status(OK).json({
      data: {
        path
      }
    });
  }
};
