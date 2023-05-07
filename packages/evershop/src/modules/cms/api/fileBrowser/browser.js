const { join } = require('path');
const { existsSync, readdirSync } = require('fs');
const { CONSTANTS } = require('@evershop/evershop/src/lib/helpers');
const { buildUrl } = require('@evershop/evershop/src/lib/router/buildUrl');
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
  } else {
    response.status(OK);
    response.json({
      data: {
        folders: readdirSync(join(CONSTANTS.MEDIAPATH, path), {
          withFileTypes: true
        })
          .filter((dirent) => dirent.isDirectory())
          .map((dirent) => dirent.name),
        files: readdirSync(join(CONSTANTS.MEDIAPATH, path), {
          withFileTypes: true
        })
          .filter((dirent) => dirent.isFile())
          .map((f) => ({
            url: buildUrl('staticAsset', [`${path}/${f.name}`]),
            name: f.name
          }))
      }
    });
  }
};
