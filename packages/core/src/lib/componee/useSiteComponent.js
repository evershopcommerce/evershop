const { existsSync } = require('fs');
const { resolve, join } = require('path');
const { CONSTANTS } = require('../helpers');
const { getConfig } = require('../util/getConfig');

// eslint-disable-next-line no-multi-assign
module.exports = exports = {};

exports.useSiteComponent = function useSiteComponent(path) {
  const theme = getConfig('shop.siteTheme');
  if (theme && existsSync(join(CONSTANTS.SITETHEMEPATH, theme, 'views', path.replace('/views/site', '')))) {
    return resolve(CONSTANTS.SITETHEMEPATH, theme, 'views', path.replace('/views/site', ''));
  } else if (existsSync(resolve(CONSTANTS.MOLDULESPATH, path))) {
    return resolve(CONSTANTS.MOLDULESPATH, path);
  } else {
    throw new Error(`Component ${path} does not exist`);
  }
};
