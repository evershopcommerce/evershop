const { resolve } = require('path');
const { CONSTANTS } = require('../helpers');
const { app } = require('../../../bin/serve/app');

export function getComponents() {
  const routeId = app.get('routeId');
  if (!routeId) {
    return {};
  } else {
    // eslint-disable-next-line global-require
    return require(resolve(CONSTANTS.ROOTPATH, '.nodejscart/build/site', routeId, 'components.js'));
  }
}
