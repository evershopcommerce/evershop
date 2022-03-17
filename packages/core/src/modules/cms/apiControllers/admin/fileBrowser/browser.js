const { join } = require('path');
const { existsSync, readdirSync } = require('fs');
const { CONSTANTS } = require('../../../../../lib/helpers');
const { buildUrl } = require('../../../../../lib/router/buildUrl');

// eslint-disable-next-line no-unused-vars
module.exports = (request, response, stack, next) => {
  const path = request.params[0] || '';
  if (!existsSync(join(CONSTANTS.MEDIAPATH, path))) {
    response.json({
      success: false,
      message: 'Requested path does not exist'
    });
  } else {
    response.json({
      success: true,
      data: {
        folders: readdirSync(join(CONSTANTS.MEDIAPATH, path), { withFileTypes: true })
          .filter((dirent) => dirent.isDirectory())
          .map((dirent) => dirent.name),
        files: readdirSync(join(CONSTANTS.MEDIAPATH, path), { withFileTypes: true })
          .filter((dirent) => dirent.isFile())
          .map((f) => ({
            url: buildUrl('adminStaticAsset', [`${path}/${f.name}`]),
            name: f.name
          }))
      }
    });
  }
};
