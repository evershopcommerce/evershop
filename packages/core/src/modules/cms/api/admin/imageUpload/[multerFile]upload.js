const { resolve } = require('path');
const { CONSTANTS } = require('../../../../../lib/helpers');
const { buildUrl } = require('../../../../../lib/router/buildUrl');

// eslint-disable-next-line no-unused-vars
module.exports = (request, response, stack, next) => {
  if (!request.files || request.files.length === 0) {
    response.json({
      success: false,
      message: 'No image was provided'
    });
  } else {
    response.json({
      success: true,
      message: 'OK',
      data: {
        files: request.files.map(
          (f) => ({
            name: f.filename,
            type: f.minetype,
            size: f.size,
            path: f.path.replace(resolve(CONSTANTS.MEDIAPATH), '').split('\\').join('/'),
            url: buildUrl('adminStaticAsset', [f.path.replace(resolve(CONSTANTS.MEDIAPATH), '').split('\\').join('/')])
          })
        )
      }
    });
  }
};
