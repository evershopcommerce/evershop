const { join, basename } = require('path');
const { existsSync, mkdirSync } = require('fs');
const { CONSTANTS } = require('@evershop/evershop/src/lib/helpers');
const {
  INVALID_PAYLOAD,
  OK
} = require('@evershop/evershop/src/lib/util/httpStatus');
const { getConfig } = require('@evershop/evershop/src/lib/util/getConfig');

// eslint-disable-next-line no-unused-vars
module.exports = (request, response, delegate, next) => {
  if (getConfig('system.file_storage') !== 'local') {
    next();
  } else {
    const { path } = request.body || '';
    const targetPath = join(CONSTANTS.MEDIAPATH, path);
    if (existsSync(targetPath)) {
      response.status(INVALID_PAYLOAD).json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'Folder already existed'
        }
      });
    } else {
      mkdirSync(targetPath, { recursive: true });
      response.status(OK).json({
        data: {
          path,
          name: basename(targetPath)
        }
      });
    }
  }
};
