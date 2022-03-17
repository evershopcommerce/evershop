const { existsSync } = require('fs');
const { resolve, join } = require('path');
const { CONSTANTS } = require('../helpers');
const { getConfig } = require('../util/getConfig');

// eslint-disable-next-line no-multi-assign
module.exports = exports = {};

exports.useAdminComponent = function useAdminComponent(path) {
  const theme = getConfig('shop.adminTheme');
  if (theme && existsSync(join(CONSTANTS.ADMINTHEMEPATH, theme, 'views', path.replace('/views/admin', '')))) {
    return resolve(CONSTANTS.ADMINTHEMEPATH, theme, 'views', path.replace('/views/admin', ''));
  } else if (existsSync(resolve(CONSTANTS.MOLDULESPATH, path))) {
    return resolve(CONSTANTS.MOLDULESPATH, path);
  } else {
    throw new Error(`Component ${path} does not exist`);
  }
};
