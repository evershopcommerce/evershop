const { join, basename } = require('path');
const { existsSync, mkdirSync } = require('fs');
const { CONSTANTS } = require('../../../../../lib/helpers');

// eslint-disable-next-line no-unused-vars
module.exports = (request, response, stack, next) => {
  const path = request.params[0] || '';
  if (existsSync(join(CONSTANTS.MEDIAPATH, path))) {
    response.json({
      success: false,
      message: 'Folder already existed',
      data: {}
    });
  } else {
    mkdirSync(join(CONSTANTS.MEDIAPATH, path), { recursive: true });
    response.json({
      success: true,
      data: {
        path,
        name: basename(join(CONSTANTS.MEDIAPATH, path))
      }
    });
  }
};
