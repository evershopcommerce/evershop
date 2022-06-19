import { useAppState } from '../context/app';
import { get } from '../util/get';

/* eslint-disable global-require */
const { resolve } = require('path');
const { CONSTANTS } = require('../helpers');

export function getComponents() {
  const route = get(useAppState(), 'route');
  if (!route) {
    return {};
  } else if (route.isAdmin === true) {
    return require(resolve(CONSTANTS.ROOTPATH, '.evershop/build/admin', route.id, 'components.js'));
  } else {
    return require(resolve(CONSTANTS.ROOTPATH, '.evershop/build/site', route.id, 'components.js'));
  }
}
