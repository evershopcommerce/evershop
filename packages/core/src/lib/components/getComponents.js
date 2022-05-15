/* eslint-disable global-require */
const { resolve } = require('path');
const { CONSTANTS } = require('../helpers');
const { app } = require('../../../bin/serve/app');

export function getComponents() {
  const route = app.get('route');
  if (!route) {
    return {};
  } else if (route.isAdmin === true) {
    return require(resolve(CONSTANTS.ROOTPATH, '.evershop/build/admin', route.id, 'components.js'));
  } else {
    return require(resolve(CONSTANTS.ROOTPATH, '.evershop/build/site', route.id, 'components.js'));
  }
}
